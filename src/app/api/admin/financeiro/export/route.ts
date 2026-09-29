import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/auth'

async function checkAuth() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (!session) return false
  
  const payload = await decrypt(session)
  if (!payload || (payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN')) {
    return false
  }
  return true
}

export async function GET() {
  try {
    const isAuth = await checkAuth()
    if (!isAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
