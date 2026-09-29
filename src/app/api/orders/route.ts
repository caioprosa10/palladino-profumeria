import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // 1. Cria usuário fake ou usa existente (simulação)
    let user = await prisma.user.findFirst()
    if (!user) {
      user = await prisma.user.create({
        data: {
          nome: 'Cliente Mock',
          email: 'mock@example.com',
          senha: '123'
        }
      })
    }

    // 2. Cria o pedido
    const pedido = await prisma.pedido.create({
      data: {
        usuario_id: user.id,
        status: 'preparo',
        subtotal: data.subtotal,
        frete: data.frete,
        total: data.total,
        transportadora: data.transportadora,
        shipping: {
          create: {
            transportadora: data.transportadora || 'Desconhecida',
            servico: data.servico || 'Normal',
            valor: data.frete,
            prazo: data.prazo || 0,
            codigo_servico: data.codigo_servico || null
          }
        },
        itens: {
          create: data.itens.map((i: any) => ({
            produto_id: i.produto_id,
            quantidade: i.quantidade,
            preco: i.preco
          }))
        }
      }
    })

    return NextResponse.json(pedido)
  } catch (error) {
    console.error('Erro ao criar pedido:', error)
    return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 })
  }
}
