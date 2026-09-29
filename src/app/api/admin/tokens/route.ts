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
    const isAuth = await checkAuth()
    if (!isAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
