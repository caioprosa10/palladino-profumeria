import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashSenha, senhaSchema } from '@/lib/password'
import { hashToken } from '@/lib/cripto'
import { SecurityService } from '@/services/security.service'
import { AuditService } from '@/services/audit.service'
import { lerCorpo, respostaDeCorpoInvalido, ipDaRequisicao } from '@/lib/validacao'

const resetSchema = z.object({
  token: z.string().min(20).max(200),
  senha: senhaSchema,
})

/**
 * Conclui a redefinição de senha.
 *
 * O token é de uso único e expira em 30 minutos. Ao trocar a senha, todas
 * as sessões do usuário são revogadas: se a conta foi comprometida, quem
 * estava dentro é posto para fora.
 */
export async function POST(req: Request) {
  const ip = ipDaRequisicao(req)

  try {
    if (await SecurityService.checkRateLimit(ip, '/api/auth/reset', 10)) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde alguns minutos.' },
        { status: 429 }
      )
    }

    const { token, senha } = await lerCorpo(req, resetSchema)

    const registro = await prisma.tokenSenha.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { usuario: { select: { id: true, ativo: true } } },
    })

    // Mensagem única para token inexistente, já usado ou expirado: detalhar
    // ajudaria a sondar tokens.
    const invalido = NextResponse.json(
      { error: 'Link inválido ou expirado. Solicite um novo.' },
      { status: 400 }
    )

    if (!registro || registro.usadoEm || registro.expiraEm < new Date()) {
      await AuditService.log({
        acao: 'SENHA_RESET_TOKEN_INVALIDO',
        ip,
        endpoint: '/api/auth/reset',
        resultado: registro ? `Token ${registro.id}` : 'Token desconhecido',
      })
      return invalido
    }

    if (!registro.usuario.ativo) {
      return invalido
    }

    const novoHash = await hashSenha(senha)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: registro.usuario_id },
        data: { senha: novoHash },
      }),
      // Uso único.
      prisma.tokenSenha.update({
        where: { id: registro.id },
        data: { usadoEm: new Date() },
      }),
      // Trocar a senha derruba as sessões abertas.
      prisma.sessao.updateMany({
        where: { usuario_id: registro.usuario_id, revogadaEm: null },
        data: { revogadaEm: new Date() },
      }),
    ])

    await AuditService.log({
      acao: 'SENHA_REDEFINIDA',
      ip,
      endpoint: '/api/auth/reset',
      resultado: `Usuário ${registro.usuario_id}`,
    })

    return NextResponse.json({ message: 'Senha alterada. Você já pode entrar.' })
  } catch (error) {
    const r = respostaDeCorpoInvalido(error)
    if (r) return r
    console.error('Erro ao redefinir senha:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
