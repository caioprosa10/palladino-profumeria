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

/** Mesma janela do JWT emitido em lib/auth.ts. */
const DURACAO_SESSAO = 60 * 60 * 24

const loginSchema = z.object({
  email: z.string().email('Credenciais inválidas').max(254),
  senha: z.string().min(1, 'Credenciais inválidas').max(128),
})

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

    const { email, senha } = await lerCorpo(req, loginSchema)

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      await AuditService.log({ acao: 'LOGIN_FALHOU', ip, endpoint: '/api/auth/login', resultado: 'E-mail não cadastrado' })
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    if (!user.ativo) {
      await AuditService.log({ acao: 'LOGIN_BLOQUEADO', ip, endpoint: '/api/auth/login', resultado: `Conta desativada: ${user.id}` })
      return NextResponse.json({ error: 'Conta desativada. Entre em contato com o suporte.' }, { status: 403 })
    }

    const passwordMatch = await conferirSenha(senha, user.senha)

    if (!passwordMatch) {
      // Registra o id, nunca a senha tentada.
      await AuditService.log({ acao: 'LOGIN_FALHOU', ip, endpoint: '/api/auth/login', resultado: `Senha incorreta: ${user.id}` })
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
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
