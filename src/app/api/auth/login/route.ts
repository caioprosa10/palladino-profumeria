import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { encrypt } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const { email, senha } = await req.json()

    if (!email || !senha) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    if (!user.ativo) {
      return NextResponse.json({ error: 'Conta desativada. Entre em contato com o suporte.' }, { status: 403 })
    }

    const passwordMatch = await bcrypt.compare(senha, user.senha)

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    // Gerar token
    const token = await encrypt({ id: user.id, email: user.email, nome: user.nome, role: user.role })

    // Setar cookie
    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 dia
      path: '/',
      sameSite: 'lax',
    })

    return NextResponse.json({
      message: 'Login bem sucedido',
      user: { id: user.id, nome: user.nome, email: user.email }
    }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
