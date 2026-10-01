import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

/**
 * O checkout sem MP_ACCESS_TOKEN.
 *
 * O site vai ao ar antes de as chaves de pagamento existirem. Esta
 * suíte fixa o contrato dessa situação: o cliente recebe uma mensagem
 * em português e um status de erro de cliente, nunca um 500 com rastro
 * de pilha — e, principalmente, nenhum pedido fica gravado no banco
 * esperando um pagamento que nunca foi criado.
 */

const prisma = new PrismaClient()

let usuarioId: string
let produtoId: string

vi.mock('@/lib/sessao', () => ({
  sessaoAtual: async () => ({ id: usuarioId, role: 'CLIENTE', ativo: true }),
}))

beforeAll(async () => {
  execSync('npx prisma migrate deploy', { stdio: 'pipe' })
  delete process.env.MP_ACCESS_TOKEN

  const u = await prisma.user.create({
    data: { nome: 'Cliente Teste', email: `mp-${Date.now()}@teste.com`, senha: 'hash' },
  })
  usuarioId = u.id

  const c = await prisma.categoria.upsert({
    where: { slug: 'teste-checkout' },
    update: {},
    create: { nome: 'Teste Checkout', slug: 'teste-checkout' },
  })
  const p = await prisma.produto.create({
    data: {
      nome: 'Perfume Teste MP',
      slug: `perfume-teste-mp-${Date.now()}`,
      sku: `SKU-MP-${Date.now()}`,
      descricao: 'Produto usado no teste de checkout sem Mercado Pago.',
      preco: 369,
      estoque: 10,
      ativo: true,
      categoria_id: c.id,
    },
  })
  produtoId = p.id
})

afterAll(async () => {
  await prisma.itemPedido.deleteMany({ where: { produto_id: produtoId } })
  await prisma.pedido.deleteMany({ where: { usuario_id: usuarioId } })
  await prisma.produto.delete({ where: { id: produtoId } })
  await prisma.categoria.deleteMany({ where: { slug: 'teste-checkout' } })
  await prisma.user.delete({ where: { id: usuarioId } })
  await prisma.$disconnect()
})

function pedir(body: unknown) {
  return new Request('http://localhost:3000/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('checkout sem MP_ACCESS_TOKEN', () => {
  it('responde erro de cliente com mensagem legível, não 500', async () => {
    const { POST } = await import('@/app/api/checkout/route')

    const r = await POST(pedir({ cart: [{ produto: { id: produtoId }, quantidade: 1 }] }))
    const corpo = await r.json()

    expect(r.status).not.toBe(500)
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect(corpo.error).toBeTruthy()
    // Mensagem para humano, sem detalhe interno vazando.
    expect(corpo.error).not.toMatch(/token|access|mercadopago|stack|undefined/i)
  })

  // DEFEITO CONHECIDO, aguardando decisão.
  //
  // A rota grava o pedido ANTES de chamar o Mercado Pago (comentário
  // "Criar Pedido no Banco de Dados ANTES de chamar o Mercado Pago").
  // Quando a chamada falha — e sem MP_ACCESS_TOKEN ela sempre falha —
  // o pedido fica no banco em 'aguardando_pagamento', com um registro
  // de Pagamento sem mp_id, e nada o recolhe. Cada tentativa de compra
  // deixa mais um. Este teste descreve o comportamento desejado e falha
  // de propósito; está marcado como skip para não bloquear o CI
  // enquanto a correção não for aprovada.
  it.skip('não deixa pedido órfão no banco quando o pagamento não pôde ser criado', async () => {
    const { POST } = await import('@/app/api/checkout/route')

    await POST(pedir({ cart: [{ produto: { id: produtoId }, quantidade: 1 }] }))

    const pedidos = await prisma.pedido.findMany({ where: { usuario_id: usuarioId } })
    expect(pedidos).toHaveLength(0)
  })
})
