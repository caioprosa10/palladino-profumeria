import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const session = await decrypt(sessionCookie)
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
        usuario_id: session.id as string,
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
