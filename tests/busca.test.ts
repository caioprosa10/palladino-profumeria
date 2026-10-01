import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

/**
 * A busca precisa ignorar maiúsculas.
 *
 * O projeto nasceu em SQLite, onde `LIKE` já ignora maiúsculas para
 * ASCII, então `contains` sozinho bastava. No Postgres `contains`
 * compila para `LIKE`, que diferencia — e a busca do site passou a não
 * achar nada, porque ninguém digita "Noble" com N maiúsculo. O que
 * corrige é `mode: 'insensitive'`, que compila para `ILIKE`.
 *
 * Este teste existe para que a regressão não volte em silêncio: ela não
 * quebra build, não quebra tipo e não gera erro em execução.
 */

const prisma = new PrismaClient()

const NOME = 'Al Noble Verde Teste'
let categoriaId: string

beforeAll(async () => {
  execSync('npx prisma migrate deploy', { stdio: 'pipe' })

  const categoria = await prisma.categoria.upsert({
    where: { slug: 'teste-busca' },
    update: {},
    create: { nome: 'Teste Busca', slug: 'teste-busca' },
  })
  categoriaId = categoria.id

  await prisma.produto.deleteMany({ where: { sku: 'SKU-BUSCA-1' } })
  await prisma.produto.create({
    data: {
      nome: NOME,
      slug: 'al-noble-verde-teste',
      sku: 'SKU-BUSCA-1',
      descricao: 'Produto usado apenas nos testes de busca.',
      preco: 369,
      ativo: true,
      categoria_id: categoriaId,
    },
  })
})

afterAll(async () => {
  await prisma.produto.deleteMany({ where: { sku: 'SKU-BUSCA-1' } })
  await prisma.categoria.deleteMany({ where: { slug: 'teste-busca' } })
  await prisma.$disconnect()
})

function buscar(termo: string) {
  return prisma.produto.findMany({
    where: {
      ativo: true,
      OR: [
        { nome: { contains: termo, mode: 'insensitive' } },
        { sku: { contains: termo, mode: 'insensitive' } },
      ],
    },
  })
}

describe('busca por produto', () => {
  it('acha independente da caixa do termo', async () => {
    for (const termo of ['noble', 'Noble', 'NOBLE', 'nObLe']) {
      const r = await buscar(termo)
      expect(r.map((p) => p.nome), termo).toContain(NOME)
    }
  })

  it('acha pelo sku em minúsculas', async () => {
    const r = await buscar('sku-busca-1')
    expect(r).toHaveLength(1)
  })

  it('não acha o que não existe', async () => {
    expect(await buscar('xyzzy-nao-existe')).toHaveLength(0)
  })

  it('contains sem mode diferencia maiúsculas no Postgres', async () => {
    // Documenta o motivo do mode:'insensitive'. Se este teste passar a
    // falhar, o dialeto mudou e a correção pode ser revista.
    const sensivel = await prisma.produto.findMany({
      where: { ativo: true, nome: { contains: 'noble' } },
    })
    expect(sensivel.map((p) => p.nome)).not.toContain(NOME)
  })
})
