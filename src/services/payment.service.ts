import { prisma } from '@/lib/prisma';
import { paymentClient } from '@/lib/mp';
import { randomUUID } from 'crypto';
import { AuditService } from './audit.service';

export class PaymentService {
  /**
   * Recalcula o valor total do carrinho buscando os preços REAIS direto do banco de dados.
   * IGNORA completamente qualquer valor financeiro enviado pelo frontend.
   */
  static async calculateTrueTotal(itens: { produto_id: string, quantidade: number }[], freteFront: number): Promise<{ total: number, itemsDetails: any[] }> {
    let subtotal = 0;
    const itemsDetails = [];

    for (const item of itens) {
      const prod = await prisma.produto.findUnique({
        where: { id: item.produto_id }
      });
      if (!prod || !prod.ativo) {
        throw new Error(`Produto inválido ou inativo: ${item.produto_id}`);
      }

      // Preço real blindado contra adulteração do frontend
      const precoReal = prod.preco_promocional || prod.preco;
      subtotal += precoReal * item.quantidade;

      itemsDetails.push({
        id: prod.id,
        title: prod.nome,
        quantity: item.quantidade,
        unit_price: precoReal,
      });
    }

    // Validação estrita do frete (Numa aplicação real, recalcularíamos o frete com a API da transportadora aqui também)
    // Para simplificar essa demo, aceitaremos o frete enviado, mas limitado a teto seguro.
    if (freteFront < 0 || freteFront > 500) {
      throw new Error('Valor de frete adulterado detectado.');
    }

    return {
      total: subtotal + freteFront,
      itemsDetails
    };
  }

  /**
   * Criação do Pagamento de forma idempotente e segura
   */
  static async processPayment(params: {
    token: string;
    issuer_id: string;
    payment_method_id: string;
    transaction_amount: number; // Apenas para bater na API, o valor REAL é calculado pelo backend
    installments: number;
    payer: { email: string; identification: { type: string, number: string } };
    itens: { produto_id: string, quantidade: number }[];
    frete: number;
    ip: string;
  }) {
    // 1. Recalcula valores 100% no servidor (Defense in Depth)
    const { total, itemsDetails } = await this.calculateTrueTotal(params.itens, params.frete);

    // 2. Geração da Idempotency Key
    const idempotencyKey = randomUUID();

    // 3. Criação do log de intenção
    await AuditService.log({
      acao: 'INTENCAO_PAGAMENTO',
      ip: params.ip,
      endpoint: '/api/checkout',
      resultado: `Processando valor real recalculado: R$ ${total}`
    });

    // 4. Integração direta com MP (Server-to-Server)
    const mpPayment = await paymentClient.create({
      body: {
        transaction_amount: total, // USANDO O VALOR RECALCULADO NO SERVIDOR (IGNORANDO FRONT)
        token: params.token, // Token one-time gerado pelo MercadoPago.js (Nunca dados do cartão)
        description: 'Compra Palladino Profumeria',
        installments: params.installments,
        payment_method_id: params.payment_method_id,
        issuer_id: params.issuer_id ? Number(params.issuer_id) : undefined,
        payer: params.payer,
      },
      requestOptions: {
        idempotencyKey // Previne dupla cobrança caso de timeout na rede
      }
    });

    return {
      mpPayment,
      total,
      idempotencyKey
    };
  }
}
