import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/auth'
import bcrypt from 'bcryptjs'

async function checkAuth() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (!session) return false
  
  const payload = await decrypt(session)
  if (!payload || payload.role !== 'SUPERADMIN') {
    return false
  }
  return true
}

export async function GET() {
  try {
    const isAuth = await checkAuth()
    if (!isAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    const isAuth = await checkAuth()
    if (!isAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { nome, email, senha, role, ativo } = await request.json()

    if (!nome || !email || !senha || !role) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
    }

    const emailExistente = await prisma.user.findUnique({
      where: { email }
    })

    if (emailExistente) {
      return NextResponse.json({ error: 'E-mail já está em uso' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(senha, 10)

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
