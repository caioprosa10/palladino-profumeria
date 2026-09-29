import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { conferirSenha } from '@/lib/password'
import { encrypt } from '@/lib/auth'
import { cookies } from 'next/headers'
import { SecurityService } from '@/services/security.service'
import { AuditService } from '@/services/audit.service'
import { lerCorpo, respostaDeCorpoInvalido, ipDaRequisicao } from '@/lib/validacao'
import { registrarSessao } from '@/lib/sessao'
import { conferirCodigo, consumirCodigoBackup } from '@/lib/dois-fatores'
import { ativo as turnstileAtivo, verificar as verificarTurnstile, mensagemDeErro } from '@/lib/turnstile'

/** Mesma janela do JWT emitido em lib/auth.ts. */
const DURACAO_SESSAO = 60 * 60 * 24

const loginSchema = z.object({
  email: z.string().email('Credenciais inválidas').max(254),
  senha: z.string().min(1, 'Credenciais inválidas').max(128),
  // Só é exigido de contas com segundo fator ativo.
  codigo: z.string().max(20).optional(),
  turnstileToken: z.string().max(4096).optional(),
})

/**
 * A partir de quantas tentativas o login passa a exigir captcha.
 *
 * Abaixo disso o desafio não aparece: quem erra a senha uma ou duas vezes
 * é quase sempre uma pessoa, e pôr um captcha na frente de todo login
 * castiga o uso legítimo sem ganho real.
 */
const TENTATIVAS_ATE_CAPTCHA = 3

/** A próxima tentativa deste IP já cairá na faixa que exige captcha? */
function proximaExigeCaptcha(tentativasAtuais: number): boolean {
  return turnstileAtivo() && tentativasAtuais + 1 >= TENTATIVAS_ATE_CAPTCHA
}

export async function POST(req: Request) {
  const ip = ipDaRequisicao(req)

  try {

    // Impede força bruta: sem isso, um atacante pode testar senhas
    // indefinidamente contra a conta de administrador.
    const bloqueado = await SecurityService.checkRateLimit(ip, '/api/auth/login', 10)
    if (bloqueado) {
      return NextResponse.json(
        { error: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' },
        { status: 429 }
      )
    }

    const { email, senha, codigo, turnstileToken } = await lerCorpo(req, loginSchema)

    // Quantas tentativas este IP já fez na janela — o próprio rate limit
    // registra isso, então não precisamos de um contador novo.
    const tentativas = await SecurityService.contarTentativas(ip, '/api/auth/login')
    const exigirCaptcha = turnstileAtivo() && tentativas >= TENTATIVAS_ATE_CAPTCHA

    if (exigirCaptcha) {
      // Fail-open no login, ao contrário de cadastro e recuperação: se a
      // Cloudflare cair, bloquear aqui tranca todo mundo fora, inclusive
      // o administrador que precisa entrar para responder a um incidente.
      // A senha, o rate limit e o 2FA continuam valendo.
      const captcha = await verificarTurnstile(turnstileToken, ip, { failClosed: false })
      const erroCaptcha = mensagemDeErro(captcha)

      if (erroCaptcha) {
        return NextResponse.json(
          { error: erroCaptcha, requerCaptcha: true },
          { status: 400 }
        )
      }
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      await AuditService.log({ acao: 'LOGIN_FALHOU', ip, endpoint: '/api/auth/login', resultado: 'E-mail não cadastrado' })
      return NextResponse.json({ error: 'Credenciais inválidas', requerCaptcha: proximaExigeCaptcha(tentativas) }, { status: 401 })
    }

    if (!user.ativo) {
      await AuditService.log({ acao: 'LOGIN_BLOQUEADO', ip, endpoint: '/api/auth/login', resultado: `Conta desativada: ${user.id}` })
      return NextResponse.json({ error: 'Conta desativada. Entre em contato com o suporte.' }, { status: 403 })
    }

    const passwordMatch = await conferirSenha(senha, user.senha)

    if (!passwordMatch) {
      // Registra o id, nunca a senha tentada.
      await AuditService.log({ acao: 'LOGIN_FALHOU', ip, endpoint: '/api/auth/login', resultado: `Senha incorreta: ${user.id}` })
      return NextResponse.json({ error: 'Credenciais inválidas', requerCaptcha: proximaExigeCaptcha(tentativas) }, { status: 401 })
    }

    // Segundo fator, quando a conta tem 2FA ativo.
    if (user.totpAtivo) {
      if (!codigo) {
        // 'requer2FA' diz à interface para pedir o código. Chegar aqui já
        // significa que a senha estava correta.
        return NextResponse.json(
          { error: 'Informe o código do seu aplicativo autenticador.', requer2FA: true },
          { status: 401 }
        )
      }

      const codigoOk = conferirCodigo(codigo, user.totpSecret)

      if (!codigoOk) {
        // Pode ser um código de recuperação, de uso único.
        const backup = consumirCodigoBackup(codigo, user.totpBackup)

        if (!backup) {
          await AuditService.log({ acao: 'LOGIN_2FA_FALHOU', ip, endpoint: '/api/auth/login', resultado: `Código inválido: ${user.id}` })
          return NextResponse.json(
            { error: 'Código inválido.', requer2FA: true },
            { status: 401 }
          )
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { totpBackup: backup.restantes || null },
        })
        await AuditService.log({ acao: 'LOGIN_2FA_BACKUP_USADO', ip, endpoint: '/api/auth/login', resultado: user.id })
      }
    }

    // Gerar token
    const token = await encrypt({ id: user.id, email: user.email, nome: user.nome, role: user.role })

    // Registra a sessão para que o logout possa revogá-la de fato.
    await registrarSessao({
      usuarioId: user.id,
      token,
      ip,
      userAgent: req.headers.get('user-agent'),
      duracaoSegundos: DURACAO_SESSAO,
    })

    // Setar cookie
    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: DURACAO_SESSAO,
      path: '/',
      sameSite: 'lax',
    })

    return NextResponse.json({
      message: 'Login bem sucedido',
      user: { id: user.id, nome: user.nome, email: user.email }
    }, { status: 200 })
  } catch (error) {
    const r = respostaDeCorpoInvalido(error)
    if (r) return r
    console.error('Erro no login:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
