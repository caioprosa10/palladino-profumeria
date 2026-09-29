import { NextResponse } from 'next/server'
import { SecurityService } from '@/services/security.service'
import { ipDaRequisicao } from '@/lib/validacao'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { hashSenha, senhaSchema } from '@/lib/password'
import { cifrar } from '@/lib/cripto'
import { AuditService } from '@/services/audit.service'
import { verificar as verificarTurnstile, mensagemDeErro } from '@/lib/turnstile'

const registerSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  senha: senhaSchema,
  cpf: z.string().max(20).optional(),
  telefone: z.string().max(20).optional(),
  // Campo-isca: invisível no formulário, então só um robô o preenche.
  website: z.string().max(200).optional(),
  turnstileToken: z.string().max(4096).optional(),
})

export async function POST(req: Request) {
  try {
    const ip = ipDaRequisicao(req)
    if (await SecurityService.checkRateLimit(ip, '/api/auth/register', 5)) {
      return NextResponse.json(
        { error: 'Muitas requisições. Aguarde alguns minutos e tente novamente.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { nome, email, senha, cpf, telefone, website, turnstileToken } = registerSchema.parse(body)

    // Cadastro é fail-closed: se a Cloudflare não responder, preferimos
    // recusar a abrir a porta para criação de contas em massa.
    const captcha = await verificarTurnstile(turnstileToken, ip, { failClosed: true })
    const erroCaptcha = mensagemDeErro(captcha)
    if (erroCaptcha) {
      await AuditService.log({ acao: 'CADASTRO_CAPTCHA_FALHOU', ip, endpoint: '/api/auth/register', resultado: captcha.ok ? '' : captcha.motivo })
      return NextResponse.json({ error: erroCaptcha }, { status: 400 })
    }

    // Responde como se tivesse dado certo: dizer "você é um robô" ensina
    // o robô a contornar a isca.
    if (website) {
      await AuditService.log({ acao: 'CADASTRO_HONEYPOT', ip, endpoint: '/api/auth/register', resultado: 'Campo-isca preenchido' })
      return NextResponse.json({ message: 'Usuário cadastrado com sucesso' }, { status: 201 })
    }

    // Verifica se e-mail já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'E-mail já está em uso' },
        { status: 400 }
      )
    }

    // Hash da senha
    const hashedPassword = await hashSenha(senha)

    // Criação do usuário
    const user = await prisma.user.create({
      data: {
        nome,
        email,
        senha: hashedPassword,
        cpf: cifrar(cpf),
        telefone,
      },
      select: {
        id: true,
        nome: true,
        email: true,
      }
    })

    return NextResponse.json({ message: 'Usuário cadastrado com sucesso', user }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
