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

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const isAuth = await checkAuth()
    if (!isAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { nome, email, senha, role, ativo } = await request.json()

    if (!nome || !email || !role) {
      return NextResponse.json({ error: 'Campos obrigatórios (Nome, E-mail, Role) ausentes' }, { status: 400 })
    }

    const emailExistente = await prisma.user.findFirst({
      where: { 
        email,
        id: { not: params.id }
      }
    })

    if (emailExistente) {
      return NextResponse.json({ error: 'E-mail já está em uso por outro usuário' }, { status: 400 })
    }

    const dataToUpdate: any = {
      nome,
      email,
      role,
      ativo
    }

    if (senha && senha.trim() !== '') {
      dataToUpdate.senha = await bcrypt.hash(senha, 10)
    }

    const adminAtualizado = await prisma.user.update({
      where: { id: params.id },
      data: dataToUpdate,
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true
      }
    })

    return NextResponse.json(adminAtualizado)
  } catch (error) {
    console.error('Erro ao atualizar administrador:', error)
    return NextResponse.json({ error: 'Erro ao atualizar administrador' }, { status: 500 })
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const isAuth = await checkAuth()
    if (!isAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Impedir que o SuperAdmin exclua a si mesmo
    const userToVerify = await prisma.user.findUnique({ where: { id: params.id } })
    if (userToVerify?.role === 'SUPERADMIN') {
      return NextResponse.json({ error: 'Não é possível excluir o Administrador Principal' }, { status: 403 })
    }

    await prisma.user.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir administrador:', error)
    return NextResponse.json({ error: 'Erro ao excluir administrador' }, { status: 500 })
  }
}
