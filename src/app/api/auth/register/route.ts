import { NextResponse } from 'next/server'
import { SecurityService } from '@/services/security.service'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { hashSenha, senhaSchema } from '@/lib/password'
import { cifrar } from '@/lib/cripto'

const registerSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  senha: senhaSchema,
  cpf: z.string().optional(),
  telefone: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'
    if (await SecurityService.checkRateLimit(ip, '/api/auth/register', 5)) {
      return NextResponse.json(
        { error: 'Muitas requisições. Aguarde alguns minutos e tente novamente.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { nome, email, senha, cpf, telefone } = registerSchema.parse(body)

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
