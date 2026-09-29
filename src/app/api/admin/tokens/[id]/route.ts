import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { cifrar } from '@/lib/cripto'
import { lerCorpo, respostaDeCorpoInvalido } from '@/lib/validacao'

const atualizarSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório').max(120),
  // Em branco significa "manter o token atual": a interface não recebe o
  // valor em claro de volta, então não tem como reenviá-lo.
  token: z.string().max(4096).optional(),
})

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const auth = await requireAdminApi()
    if (auth.response) return auth.response

    const { titulo, token } = await lerCorpo(request, atualizarSchema)

    const dados: { titulo: string; token?: string } = { titulo }
    if (token && token.trim()) {
      dados.token = cifrar(token.trim())!
    }

    await prisma.tokenIntegracao.update({
      where: { id: params.id },
      data: dados,
    })

    // Não devolve o token, nem cifrado.
    return NextResponse.json({ success: true })
  } catch (error) {
    const r = respostaDeCorpoInvalido(error)
    if (r) return r
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
