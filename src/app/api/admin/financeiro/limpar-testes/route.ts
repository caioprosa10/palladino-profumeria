import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/guard'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi()
    if (auth.response) return auth.response

    // Apaga pedidos cujo pagamento está pendente ou rejeitado (testes)
    // Usamos deleteMany porque os modelos dependentes (ItemPedido, Pagamento, Shipping)
    // têm `onDelete: Cascade` no schema.
    const result = await prisma.pedido.deleteMany({
      where: {
        pagamentoObj: {
          status: {
            notIn: ['approved', 'paid']
          }
        }
      }
    })

    // Apaga os pedidos que ficaram sem pagamentoObj (se existirem casos legados)
    const resultNoPayment = await prisma.pedido.deleteMany({
      where: {
        pagamentoObj: null
      }
    })

    await prisma.adminLog.create({
      data: {
        usuario_id: auth.user.id,
        acao: 'CLEANUP_TEST_ORDERS',
        detalhes: `Foram removidos ${result.count + resultNoPayment.count} pedidos não pagos do banco de dados.`
      }
    })

    return NextResponse.json({ success: true, count: result.count + resultNoPayment.count })
  } catch (error) {
    console.error('Erro ao limpar testes:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
