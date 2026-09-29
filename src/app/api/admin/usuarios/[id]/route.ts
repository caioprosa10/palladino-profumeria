import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { hashSenha, senhaSchema } from '@/lib/password'

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const auth = await requireAdminApi()
    if (auth.response) return auth.response

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
      const senhaValida = senhaSchema.safeParse(senha)
      if (!senhaValida.success) {
        return NextResponse.json({ error: senhaValida.error.issues[0].message }, { status: 400 })
      }
      dataToUpdate.senha = await hashSenha(senha)
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
    const auth = await requireAdminApi()
    if (auth.response) return auth.response

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
