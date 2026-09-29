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

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const isAuth = await checkAuth()
    if (!isAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { titulo, token } = await request.json()

    if (!titulo || !token) {
      return NextResponse.json({ error: 'Título e Token são obrigatórios' }, { status: 400 })
    }

    const tokenAtualizado = await prisma.tokenIntegracao.update({
      where: { id: params.id },
      data: {
        titulo,
        token
      }
    })

    return NextResponse.json(tokenAtualizado)
  } catch (error) {
    console.error('Erro ao atualizar token:', error)
    return NextResponse.json({ error: 'Erro ao atualizar token' }, { status: 500 })
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const isAuth = await checkAuth()
    if (!isAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await prisma.tokenIntegracao.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir token:', error)
    return NextResponse.json({ error: 'Erro ao excluir token' }, { status: 500 })
  }
}
