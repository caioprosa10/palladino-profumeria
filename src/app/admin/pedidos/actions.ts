'use server'

import { cookies } from 'next/headers'
import { decrypt } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EmailService } from '@/services/email.service'
import { revalidatePath } from 'next/cache'

export async function updateOrderAction(pedidoId: string, novoStatus: string, rastreamento: string, transportadora: string) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value
    
    if (!sessionCookie) return { success: false, message: 'Unauthorized' }
    
    const session = await decrypt(sessionCookie)
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return { success: false, message: 'Forbidden' }
    }

    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { usuario: true }
    })

    if (!pedido) return { success: false, message: 'Pedido não encontrado' }

    // Validação estrita de status
    const statusValidos = ['aguardando_pagamento', 'pago', 'em_preparacao', 'enviado', 'entregue', 'cancelado']
    if (!statusValidos.includes(novoStatus)) {
      return { success: false, message: 'Status inválido' }
    }

    // 1. Atualizar Pedido
    await prisma.pedido.update({
      where: { id: pedidoId },
      data: { status: novoStatus }
    })

    // 2. Atualizar Shipping
    if (rastreamento) {
      await prisma.shipping.upsert({
        where: { pedido_id: pedidoId },
        update: { rastreamento, transportadora: transportadora || 'Correios' },
        create: { 
          pedido_id: pedidoId, 
          rastreamento, 
          transportadora: transportadora || 'Correios', 
          servico: 'Padrão', 
          valor: pedido.frete, 
          prazo: 5 
        }
      })
    }

    // 3. Enviar e-mails
    try {
      if (novoStatus === 'em_preparacao') {
        await EmailService.sendOrderPreparing(pedido.usuario.email, pedido.usuario.nome, pedido.id)
      } else if (novoStatus === 'enviado' && rastreamento) {
        await EmailService.sendOrderShipped(pedido.usuario.email, pedido.usuario.nome, pedido.id, rastreamento, transportadora || 'Correios')
      } else if (novoStatus === 'entregue') {
        await EmailService.sendOrderDelivered(pedido.usuario.email, pedido.usuario.nome, pedido.id)
      }
    } catch (err) {
      console.error("Falha ao enviar e-mail admin:", err)
    }

    // 4. Log Admin
    await prisma.adminLog.create({
      data: {
        usuario_id: session.id as string,
        acao: 'UPDATE_ORDER_STATUS',
        detalhes: `Pedido ${pedidoId} alterado de ${pedido.status} para ${novoStatus}. Rastreio: ${rastreamento || 'N/A'}`
      }
    })

    revalidatePath('/admin/pedidos')
    revalidatePath('/admin')
    revalidatePath('/admin/financeiro')
    revalidatePath(`/minha-conta/pedidos/${pedidoId}`)
    
    return { success: true }
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error)
    return { success: false, message: 'Erro interno do servidor' }
  }
}

export async function deleteOrderAction(pedidoId: string) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value
    
    if (!sessionCookie) return { success: false, message: 'Unauthorized' }
    
    const session = await decrypt(sessionCookie)
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return { success: false, message: 'Forbidden' }
    }

    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId }
    })

    if (!pedido) return { success: false, message: 'Pedido não encontrado' }

    // Log Admin ANTES de excluir
    await prisma.adminLog.create({
      data: {
        usuario_id: session.id as string,
        acao: 'DELETE_ORDER',
        detalhes: `Pedido ${pedidoId} deletado. Valor total: R$ ${pedido.total}`
      }
    })

    // Exclusão real no banco
    await prisma.pedido.delete({
      where: { id: pedidoId }
    })

    revalidatePath('/admin/pedidos')
    revalidatePath('/admin')
    revalidatePath('/admin/financeiro')
    
    return { success: true }
  } catch (error) {
    console.error("Erro ao deletar pedido:", error)
    return { success: false, message: 'Erro interno do servidor ao deletar' }
  }
}
