import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/guard'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const auth = await requireAdminApi()
    if (auth.response) return auth.response

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
    const auth = await requireAdminApi()
    if (auth.response) return auth.response

    await prisma.tokenIntegracao.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir token:', error)
    return NextResponse.json({ error: 'Erro ao excluir token' }, { status: 500 })
  }
}
