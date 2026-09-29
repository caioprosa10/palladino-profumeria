import { NextResponse } from 'next/server';
import { SecurityService } from '@/services/security.service';
import { AuditService } from '@/services/audit.service';
import { paymentClient } from '@/lib/mp';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/services/email.service';

const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  
  try {
    // Em produção o segredo é obrigatório: sem ele não há como distinguir um
    // webhook legítimo do Mercado Pago de um POST forjado marcando pedidos como pagos.
    if (IS_PRODUCTION && !MP_WEBHOOK_SECRET) {
      await AuditService.log({ acao: 'WEBHOOK_MISCONFIGURED', ip, endpoint: '/api/webhooks', resultado: 'MP_WEBHOOK_SECRET ausente' });
      return NextResponse.json({ error: 'Webhook não configurado' }, { status: 500 });
    }

    const signature = req.headers.get('x-signature') || '';
    const requestId = req.headers.get('x-request-id') || '';
    
    const url = new URL(req.url);
    const dataId = url.searchParams.get('data.id') || '';
    const type = url.searchParams.get('type') || '';

    // 1. Validação Criptográfica HMAC
    const isValid = SecurityService.verifyMercadoPagoSignature(signature, requestId, dataId, MP_WEBHOOK_SECRET ?? '');
    
    if (!isValid && IS_PRODUCTION) {
      await AuditService.log({ acao: 'WEBHOOK_SIGNATURE_FAILED', ip, endpoint: '/api/webhooks', resultado: 'Assinatura Inválida' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (type !== 'payment') {
      return NextResponse.json({ message: 'Ignorado' }, { status: 200 });
    }

    // 2. Nunca confie no payload recebido. Faça a busca ativa (GET) no MP
    const mpPayment = await paymentClient.get({ id: dataId });

    if (!mpPayment) {
      await AuditService.log({ acao: 'WEBHOOK_PAYMENT_NOT_FOUND', ip, endpoint: '/api/webhooks', resultado: `ID: ${dataId}` });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const pedidoId = mpPayment.external_reference;

    if (!pedidoId) {
      return NextResponse.json({ message: 'Sem referência de pedido' }, { status: 200 });
    }

    // 3. Verifica se o pedido pertence ao nosso BD
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { 
        usuario: true,
        pagamentoObj: true,
        itens: true
      }
    });

    if (!pedido || !pedido.pagamentoObj) {
      await AuditService.log({ acao: 'WEBHOOK_UNKNOWN_PAYMENT', ip, endpoint: '/api/webhooks', resultado: `PEDIDO: ${pedidoId}` });
      return NextResponse.json({ message: 'Pedido desconhecido' }, { status: 200 });
    }

    // 4. Validação de Valor
    if (mpPayment.transaction_amount !== pedido.pagamentoObj.valor) {
      await AuditService.log({ acao: 'WEBHOOK_AMOUNT_MISMATCH', ip, endpoint: '/api/webhooks', resultado: `MP: ${mpPayment.transaction_amount}, DB: ${pedido.pagamentoObj.valor}` });
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    // Verifica se já não foi processado (Idempotência/Status Atual)
    if (pedido.pagamentoObj.status === mpPayment.status && pedido.pagamentoObj.mp_id === String(mpPayment.id)) {
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    const pagamentoId = pedido.pagamentoObj.id;

    // 5. Atualiza o banco de dados e dispara e-mail se aprovado
    await prisma.$transaction(async (tx) => {
      await tx.pagamento.update({
        where: { id: pagamentoId },
        data: { 
          status: mpPayment.status,
          mp_id: String(mpPayment.id) 
        }
      });

      if (mpPayment.status === 'approved') {
        // Só baixa estoque na transição para 'pago'. Se o webhook repetir,
        // o pedido já está pago e o estoque não é debitado de novo.
        const primeiraAprovacao = pedido.status !== 'pago';

        await tx.pedido.update({
          where: { id: pedido.id },
          data: { status: 'pago' }
        });

        if (primeiraAprovacao) {
          for (const item of pedido.itens) {
            await tx.produto.update({
              where: { id: item.produto_id },
              data: { estoque: { decrement: item.quantidade } }
            });
          }
        }
        
        // Disparar E-mail 1 — Compra realizada com sucesso
        try {
          await EmailService.sendOrderConfirmed(pedido.usuario.email, pedido.usuario.nome, pedido.id, pedido.total);
          await AuditService.log({ acao: 'EMAIL_SENT', ip, endpoint: '/api/webhooks', resultado: `E-mail Confirmação enviado para ${pedido.usuario.email}` });
        } catch (e: any) {
          console.error("Falha ao enviar e-mail:", e);
          await AuditService.log({ acao: 'EMAIL_FAILED', ip, endpoint: '/api/webhooks', resultado: `Falha ao enviar e-mail Confirmação: ${e.message}` });
        }

      } else if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') {
        await tx.pedido.update({
          where: { id: pedido.id },
          data: { status: 'cancelado' }
        });
      }
    });

    await AuditService.log({ acao: 'WEBHOOK_SUCCESS', ip, endpoint: '/api/webhooks', resultado: `Pedido ${pedido.id} atualizado para ${mpPayment.status}` });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Webhook Error:', error);
    await AuditService.log({ acao: 'WEBHOOK_ERROR', ip, endpoint: '/api/webhooks', resultado: error.message });
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
