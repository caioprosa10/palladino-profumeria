import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/guard'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const auth = await requireAdminApi()
    if (auth.response) return auth.response

    // Fetch all non-canceled orders
    const pedidos = await prisma.pedido.findMany({
      where: { status: { not: 'cancelado' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        subtotal: true,
        frete: true,
        total: true,
        status: true,
        usuario: {
          select: {
            nome: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(pedidos)
  } catch (error) {
    console.error('Erro ao exportar dados financeiros:', error)
    return NextResponse.json({ error: 'Erro ao buscar dados financeiros' }, { status: 500 })
  }
}
