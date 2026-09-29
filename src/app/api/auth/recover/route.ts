import { NextResponse } from 'next/server'
import { z } from 'zod'
import { SecurityService } from '@/services/security.service'
import { prisma } from '@/lib/prisma'
import { lerCorpo, respostaDeCorpoInvalido, ipDaRequisicao } from '@/lib/validacao'
import { gerarToken, hashToken } from '@/lib/cripto'
import { EmailService } from '@/services/email.service'
import { AuditService } from '@/services/audit.service'
import { verificar as verificarTurnstile, mensagemDeErro } from '@/lib/turnstile'

const recoverSchema = z.object({
  email: z.string().email('E-mail inválido').max(254),
  turnstileToken: z.string().max(4096).optional(),
})

/** Janela curta: o link é um caminho de acesso à conta. */
const VALIDADE_MINUTOS = 30

export async function POST(req: Request) {
  try {
    const ip = ipDaRequisicao(req)
    if (await SecurityService.checkRateLimit(ip, '/api/auth/recover', 5)) {
      return NextResponse.json(
        { error: 'Muitas requisições. Aguarde alguns minutos e tente novamente.' },
        { status: 429 }
      )
    }

    const { email, turnstileToken } = await lerCorpo(req, recoverSchema)

    // Também fail-closed: sem isso o endpoint serve para disparar e-mails
    // em volume contra endereços de terceiros.
    const captcha = await verificarTurnstile(turnstileToken, ip, { failClosed: true })
    const erroCaptcha = mensagemDeErro(captcha)
    if (erroCaptcha) {
      return NextResponse.json({ error: erroCaptcha }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    // A resposta é sempre a mesma, exista o e-mail ou não: variar aqui
    // permitiria descobrir quais endereços estão cadastrados.
    const resposta = NextResponse.json({
      message: 'Se o e-mail existir, você receberá as instruções em breve.',
    })

    if (!user || !user.ativo) {
      return resposta
    }

    // Invalida pedidos anteriores ainda pendentes: só o link mais recente vale.
    await prisma.tokenSenha.updateMany({
      where: { usuario_id: user.id, usadoEm: null },
      data: { usadoEm: new Date() },
    })

    // O token em claro existe apenas no link enviado; o banco guarda o hash.
    const token = gerarToken()

    await prisma.tokenSenha.create({
      data: {
        usuario_id: user.id,
        tokenHash: hashToken(token),
        expiraEm: new Date(Date.now() + VALIDADE_MINUTOS * 60 * 1000),
      },
    })

    const base = process.env.APP_URL?.replace(/\/$/, '') || new URL(req.url).origin
    const link = `${base}/redefinir-senha?token=${token}`

    try {
      await EmailService.sendPasswordReset(user.email, user.nome, link)
      await AuditService.log({
        acao: 'SENHA_RESET_SOLICITADO',
        ip,
        endpoint: '/api/auth/recover',
        resultado: `Usuário ${user.id}`,
      })
    } catch (e: any) {
      // Falha de SMTP não deve revelar que o e-mail existe.
      console.error('Falha ao enviar e-mail de redefinição:', e?.message)
      await AuditService.log({
        acao: 'SENHA_RESET_EMAIL_FALHOU',
        ip,
        endpoint: '/api/auth/recover',
        resultado: `Usuário ${user.id}: ${e?.message}`,
      })
    }

    return resposta
  } catch (error) {
    const r = respostaDeCorpoInvalido(error)
    if (r) return r
    console.error('Erro na recuperação de senha:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
