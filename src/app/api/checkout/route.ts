import { MercadoPagoConfig, Preference } from 'mercadopago';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN as string });

export async function POST(request: Request) {
  try {
    // 1. Verificação de Autenticação (Apenas usuários logados podem comprar)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Você precisa estar logado para finalizar a compra.' }, { status: 401 });
    }

    const session = await decrypt(sessionCookie);
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
    }

    const userId = session.id as string;

    const body = await request.json();
    const { cart, frete } = body;

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    let subtotal = 0;

    const items = cart.map((item: any) => {
      const preco = Number(item.produto.preco);
      const qtd = Number(item.quantidade);

      if (!Number.isFinite(preco) || !Number.isFinite(qtd)) {
        throw new Error(`Valores inválidos no produto: ${item.produto.nome}`);
      }

      subtotal += preco * qtd;

      return {
        id: String(item.produto.id),
        title: String(item.produto.nome),
        quantity: qtd,
        unit_price: preco, 
        currency_id: 'BRL',
      };
    });

    const valorFrete = Number(frete) > 0 ? Number(frete) : 0;
    if (!Number.isFinite(valorFrete)) {
      throw new Error('Valor do frete inválido');
    }

    if (valorFrete > 0) {
      items.push({
        id: 'frete',
        title: 'Custo de Envio',
        quantity: 1,
        unit_price: valorFrete,
        currency_id: 'BRL',
      });
    }

    const total = subtotal + valorFrete;

    // 2. Criar Pedido no Banco de Dados ANTES de chamar o Mercado Pago
    // Usamos Transaction para garantir integridade
    const novoPedido = await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.create({
        data: {
          usuario_id: userId,
          status: 'aguardando_pagamento',
          subtotal,
          frete: valorFrete,
          total,
          itens: {
            create: cart.map((item: any) => ({
              produto_id: item.produto.id,
              quantidade: Number(item.quantidade),
              preco: Number(item.produto.preco),
            }))
          },
          // Cria o registro base de pagamento (mp_id ficará vazio até o webhook chegar)
          pagamentoObj: {
            create: {
              status: 'pending',
              valor: total,
              moeda: 'BRL',
              idempotencyKey: uuidv4(),
            }
          }
        },
        include: {
          pagamentoObj: true
        }
      });

      return pedido;
    });

    // 3. Criar a Preference no Mercado Pago, referenciando o ID do nosso banco
    const preferenceData: any = {
      body: {
        items: items,
        back_urls: {
          success: `${baseUrl}/sucesso`,
          failure: `${baseUrl}/checkout`,
          pending: `${baseUrl}/pendente`
        },
        // O Mercado Pago retornará este ID no Webhook para sabermos de qual pedido se trata
        external_reference: novoPedido.id, 
      }
    };

    if (protocol === 'https') {
      preferenceData.body.auto_return = 'approved';
    }

    const preference = new Preference(client);
    const response = await preference.create(preferenceData);

    const urlDePagamento = response.sandbox_init_point || response.init_point;
    return NextResponse.json({ url: urlDePagamento });

  } catch (error: any) {
    console.error('--- ERRO AO CRIAR PREFERÊNCIA ---', error);
    return NextResponse.json(
      { error: 'Falha ao processar o pedido. Tente novamente mais tarde.' }, 
      { status: error.status || 500 }
    );
  }
}
