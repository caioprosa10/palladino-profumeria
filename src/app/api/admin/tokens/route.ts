import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { cifrar, decifrar } from '@/lib/cripto'
import { lerCorpo, respostaDeCorpoInvalido } from '@/lib/validacao'

const tokenSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório').max(120),
  token: z.string().min(1, 'Token é obrigatório').max(4096),
})

/**
 * Mostra só as pontas do token.
 *
 * A listagem devolvia o token inteiro para a interface, o que expunha a
 * credencial a qualquer coisa capaz de ler a resposta — extensão de
 * navegador, log de proxy, captura de tela. Para conferir qual credencial
 * está cadastrada, as pontas bastam.
 */
function mascarar(valor: string): string {
  const claro = decifrar(valor)
  if (!claro) return ''
  if (claro.length <= 12) return '••••'
  return `${claro.slice(0, 6)}...${claro.slice(-4)}`
}

export async function GET() {
  try {
    const auth = await requireAdminApi()
    if (auth.response) return auth.response

    const tokens = await prisma.tokenIntegracao.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, titulo: true, token: true, createdAt: true, updatedAt: true },
    })

    return NextResponse.json(
      tokens.map(({ token, ...resto }) => ({ ...resto, tokenMascarado: mascarar(token) }))
    )
  } catch (error) {
    console.error('Erro ao buscar tokens:', error)
    return NextResponse.json({ error: 'Erro ao buscar tokens' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi()
    if (auth.response) return auth.response

    const { titulo, token } = await lerCorpo(request, tokenSchema)

    const novoToken = await prisma.tokenIntegracao.create({
      data: { titulo, token: cifrar(token)! },
      select: { id: true, titulo: true, createdAt: true },
    })

    // A resposta não devolve o token: quem o enviou já o tem.
    return NextResponse.json(novoToken, { status: 201 })
  } catch (error) {
    const r = respostaDeCorpoInvalido(error)
    if (r) return r
    console.error('Erro ao criar token:', error)
    return NextResponse.json({ error: 'Erro ao criar token' }, { status: 500 })
  }
}
