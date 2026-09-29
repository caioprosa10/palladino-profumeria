import { requireAdminPage } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import ProductForm from '@/components/admin/ProductForm'

export default async function NovoProdutoPage() {
  await requireAdminPage()

  const categorias = await prisma.categoria.findMany({
    orderBy: { nome: 'asc' }
  })

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)' }}>Novo Produto</h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Preencha os dados abaixo para cadastrar um novo produto na loja.</p>
      </div>

      <ProductForm categorias={categorias} />
    </div>
  )
}
