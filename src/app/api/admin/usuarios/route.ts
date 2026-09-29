import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { hashSenha, senhaSchema } from '@/lib/password'

export async function GET() {
  try {
    const auth = await requireAdminApi()
    if (auth.response) return auth.response

    const usuarios = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        createdAt: true
      }
    })
    return NextResponse.json(usuarios)
  } catch (error) {
    console.error('Erro ao buscar administradores:', error)
    return NextResponse.json({ error: 'Erro ao buscar administradores' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi()
    if (auth.response) return auth.response

    const { nome, email, senha, role, ativo } = await request.json()

    // Conta de administrador exige senha forte como qualquer outra.
    const senhaValida = senhaSchema.safeParse(senha)
    if (!senhaValida.success) {
      return NextResponse.json({ error: senhaValida.error.issues[0].message }, { status: 400 })
    }

    if (!nome || !email || !senha || !role) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
    }

    const emailExistente = await prisma.user.findUnique({
      where: { email }
    })

    if (emailExistente) {
      return NextResponse.json({ error: 'E-mail já está em uso' }, { status: 400 })
    }

    const hashedPassword = await hashSenha(senha)

    const novoAdmin = await prisma.user.create({
      data: {
        nome,
        email,
        senha: hashedPassword,
        role,
        ativo: ativo ?? true
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true
      }
    })

    return NextResponse.json(novoAdmin, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar administrador:', error)
    return NextResponse.json({ error: 'Erro ao criar administrador' }, { status: 500 })
  }
}
