import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminPage } from '@/lib/guard'
import Link from 'next/link'
import ProductTable from '@/components/admin/ProductTable'

export default async function AdminProdutos({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  await requireAdminPage()

  const { q, page } = await searchParams
  const currentPage = Number(page) || 1
  const perPage = 10

  // Anotado para o TypeScript preservar o literal 'insensitive' em vez
  // de alargá-lo para string, que não casa com QueryMode.
  const whereClause: Prisma.ProdutoWhereInput = q
    ? {
        OR: [
          { nome: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {}

  const [produtos, totalItems] = await Promise.all([
    prisma.produto.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: { categoria: true },
      skip: (currentPage - 1) * perPage,
      take: perPage,
    }),
    prisma.produto.count({ where: whereClause })
  ])

  const totalPages = Math.ceil(totalItems / perPage)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)' }}>Gestão de Produtos</h1>
        <Link href="/admin/produtos/novo" style={{ padding: '10px 20px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, textDecoration: 'none' }}>
          + Novo Produto
        </Link>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <form style={{ display: 'flex', gap: '10px' }} action="/admin/produtos">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome ou SKU..."
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '300px' }}
          />
          <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}>
            Pesquisar
          </button>
        </form>
      </div>

      <ProductTable produtos={produtos} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', gap: '10px' }}>
          {Array.from({ length: totalPages }).map((_, i) => (
            <Link
              key={i}
              href={`/admin/produtos?page=${i + 1}${q ? `&q=${q}` : ''}`}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                backgroundColor: currentPage === i + 1 ? '#0f172a' : '#fff',
                color: currentPage === i + 1 ? '#fff' : '#0f172a',
                border: '1px solid #cbd5e1',
                textDecoration: 'none',
                fontWeight: 500
              }}
            >
              {i + 1}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
