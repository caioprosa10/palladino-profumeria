import { MercadoPagoConfig, Preference } from 'mercadopago';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { shippingService } from '@/services/MelhorEnvioService';
import { SecurityService } from '@/services/security.service';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN as string });

const MAX_QUANTIDADE_POR_ITEM = 99;

/**
 * Extrai apenas o id do produto e a quantidade do corpo da requisição.
 * Preço, nome e disponibilidade vêm sempre do banco — nunca do cliente.
 */
function lerItensDoCarrinho(cart: unknown) {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new Error('Carrinho vazio.');
  }

  const porProduto = new Map<string, number>();

  for (const item of cart as any[]) {
    const produtoId = String(item?.produto?.id ?? item?.produto_id ?? '').trim();
    const quantidade = Number(item?.quantidade);

    if (!produtoId) {
      throw new Error('Item do carrinho sem identificação de produto.');
    }

    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > MAX_QUANTIDADE_POR_ITEM) {
      throw new Error('Quantidade inválida no carrinho.');
    }

    // O mesmo produto pode chegar repetido; somamos para validar o estoque total.
    porProduto.set(produtoId, (porProduto.get(produtoId) ?? 0) + quantidade);
  }

  return porProduto;
}

export async function POST(request: Request) {
  try {
    // Cada tentativa grava um pedido e cria uma preferência no Mercado Pago.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    if (await SecurityService.checkRateLimit(ip, '/api/checkout', 10)) {
      return NextResponse.json(
        { error: 'Muitas tentativas de pagamento. Aguarde alguns minutos.' },
        { status: 429 }
      );
    }

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
    const quantidadePorProduto = lerItensDoCarrinho(body?.cart);

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // 2. Busca os produtos reais. O preço cobrado é sempre o preço do banco,
    // caso contrário o cliente poderia enviar qualquer valor no corpo da requisição.
    const produtos = await prisma.produto.findMany({
      where: { id: { in: [...quantidadePorProduto.keys()] }, ativo: true },
      select: { id: true, nome: true, preco: true, estoque: true },
    });

    if (produtos.length !== quantidadePorProduto.size) {
      return NextResponse.json(
        { error: 'Um ou mais produtos do carrinho não estão mais disponíveis.' },
        { status: 409 }
      );
    }

    let subtotal = 0;
    const items = [];

    for (const produto of produtos) {
      const quantidade = quantidadePorProduto.get(produto.id)!;

      if (produto.estoque < quantidade) {
        return NextResponse.json(
          { error: `Estoque insuficiente para "${produto.nome}".` },
          { status: 409 }
        );
      }

      const preco = Number(produto.preco);
      if (!Number.isFinite(preco) || preco <= 0) {
        return NextResponse.json(
          { error: `Produto "${produto.nome}" está com preço inválido.` },
          { status: 409 }
        );
      }

      subtotal += preco * quantidade;

      items.push({
        id: produto.id,
        title: produto.nome,
        quantity: quantidade,
        unit_price: preco,
        currency_id: 'BRL',
      });
    }

    // 3. Recalcula o frete no servidor. O cliente informa apenas o CEP e o
    // serviço escolhido; o valor que ele viu na tela não é aceito como verdade,
    // caso contrário bastaria enviar frete = 0 para não pagar o envio.
    const cepDestino = String(body?.cepDestino ?? '').replace(/\D/g, '');
    const freteId = Number(body?.freteId);

    let freteFinal = 0;

    if (freteId > 0) {
      if (cepDestino.length !== 8) {
        return NextResponse.json(
          { error: 'Informe um CEP válido e recalcule o frete.' },
          { status: 400 }
        );
      }

      let opcoes;
      try {
        opcoes = await shippingService.calculate({
          cepDestino,
          produtos: produtos.map((produto) => ({
            id: produto.id,
            width: 15,
            height: 15,
            length: 15,
            weight: 0.5,
            insurance_value: Number(produto.preco),
            quantity: quantidadePorProduto.get(produto.id)!,
          })),
        });
      } catch {
        // Sem cotação confiável não há como cobrar o envio: é preferível
        // interromper a compra a cobrar um valor que o cliente escolheu.
        return NextResponse.json(
          { error: 'Não foi possível confirmar o valor do frete. Recalcule e tente novamente.' },
          { status: 503 }
        );
      }

      const escolhida = opcoes.find((opcao) => Number(opcao.id) === freteId);

      if (!escolhida) {
        return NextResponse.json(
          { error: 'A opção de frete escolhida não está mais disponível. Recalcule o frete.' },
          { status: 409 }
        );
      }

      const precoFrete = Number(escolhida.price);
      if (!Number.isFinite(precoFrete) || precoFrete < 0) {
        return NextResponse.json(
          { error: 'Não foi possível confirmar o valor do frete. Recalcule e tente novamente.' },
          { status: 503 }
        );
      }

      freteFinal = precoFrete;
    }

    if (freteFinal > 0) {
      items.push({
        id: 'frete',
        title: 'Custo de Envio',
        quantity: 1,
        unit_price: freteFinal,
        currency_id: 'BRL',
      });
    }

    const total = subtotal + freteFinal;

    // 4. Criar Pedido no Banco de Dados ANTES de chamar o Mercado Pago
    // Usamos Transaction para garantir integridade
    const novoPedido = await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.create({
        data: {
          usuario_id: userId,
          status: 'aguardando_pagamento',
          subtotal,
          frete: freteFinal,
          total,
          itens: {
            create: produtos.map((produto) => ({
              produto_id: produto.id,
              quantidade: quantidadePorProduto.get(produto.id)!,
              preco: Number(produto.preco),
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

    // 5. Criar a Preference no Mercado Pago, referenciando o ID do nosso banco
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
