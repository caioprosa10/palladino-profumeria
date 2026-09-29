import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/guard'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const auth = await requireAdminApi()
    if (auth.response) return auth.response

    const tokens = await prisma.tokenIntegracao.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(tokens)
  } catch (error) {
    console.error('Erro ao buscar tokens:', error)
    return NextResponse.json({ error: 'Erro ao buscar tokens' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi()
    if (auth.response) return auth.response

    const { titulo, token } = await request.json()

    if (!titulo || !token) {
      return NextResponse.json({ error: 'Título e Token são obrigatórios' }, { status: 400 })
    }

    const novoToken = await prisma.tokenIntegracao.create({
      data: {
        titulo,
        token
      }
    })

    return NextResponse.json(novoToken, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar token:', error)
    return NextResponse.json({ error: 'Erro ao criar token' }, { status: 500 })
  }
}
