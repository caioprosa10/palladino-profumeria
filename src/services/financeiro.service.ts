import { prisma } from '@/lib/prisma';

export class FinanceiroService {
  /**
   * Retorna apenas os pedidos que representam receita real (pagamento aprovado).
   */
  static async getPedidosValidos(limite?: number) {
    return prisma.pedido.findMany({
      where: {
        pagamentoObj: {
          status: {
            in: ['approved', 'paid']
          }
        },
        status: {
          not: 'cancelado' // Dupla validação, apenas por precaução
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limite,
      include: {
        usuario: { select: { nome: true, email: true } },
        pagamentoObj: true,
        shipping: true
      }
    });
  }

  /**
   * Retorna todas as métricas financeiras cruciais já filtradas (faturamento real).
   */
  static async getMetricas() {
    const pedidosValidos = await this.getPedidosValidos();

    const agora = new Date();
    const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    
    const inicioSemana = new Date(inicioDia);
    inicioSemana.setDate(inicioDia.getDate() - inicioDia.getDay()); 
    
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const inicioAno = new Date(agora.getFullYear(), 0, 1);

    let fatDia = 0, fatSemana = 0, fatMes = 0, fatAno = 0;
    const totalVendas = pedidosValidos.length;
    const totalReceita = pedidosValidos.reduce((acc, p) => acc + p.total, 0);

    pedidosValidos.forEach(p => {
      const data = new Date(p.createdAt);
      if (data >= inicioDia) fatDia += p.total;
      if (data >= inicioSemana) fatSemana += p.total;
      if (data >= inicioMes) fatMes += p.total;
      if (data >= inicioAno) fatAno += p.total;
    });

    const ticketMedio = totalVendas > 0 ? totalReceita / totalVendas : 0;

    return {
      faturamentoDia: fatDia,
      faturamentoSemana: fatSemana,
      faturamentoMes: fatMes,
      faturamentoAno: fatAno,
      receitaBrutaGlobal: totalReceita,
      ticketMedio,
      vendasConfirmadas: totalVendas,
      pedidos: pedidosValidos
    };
  }

  /**
   * Obtém a contagem de todos os status para o painel operacional.
   * Diferente do financeiro, o operacional precisa ver pedidos "em preparo" (mesmo não pagos)
   */
  static async getStatusOperacionais() {
    const pedidosStatus = await prisma.pedido.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    const counts = {
      pendentes: pedidosStatus.find(s => s.status === 'aguardando_pagamento' || s.status === 'preparo')?._count.id || 0,
      separacao: pedidosStatus.find(s => s.status === 'pago' || s.status === 'em_preparacao')?._count.id || 0,
      enviados: pedidosStatus.find(s => s.status === 'enviado' || s.status === 'transito')?._count.id || 0,
      entregues: pedidosStatus.find(s => s.status === 'entregue')?._count.id || 0,
      cancelados: pedidosStatus.find(s => s.status === 'cancelado')?._count.id || 0,
    };

    return counts;
  }
}
