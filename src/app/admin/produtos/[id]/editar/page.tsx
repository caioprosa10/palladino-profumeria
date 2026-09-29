import { requireAdminPage } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import ProductForm from '@/components/admin/ProductForm'
import { redirect } from 'next/navigation'

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAdminPage()

  const produto = await prisma.produto.findUnique({
    where: { id },
    include: { imagens: true }
  })

  if (!produto) {
    redirect('/admin/produtos')
  }

  const categorias = await prisma.categoria.findMany({
    orderBy: { nome: 'asc' }
  })

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)' }}>Editar Produto</h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Atualize as informações do produto: <strong>{produto.nome}</strong></p>
      </div>

      <ProductForm categorias={categorias} initialData={produto} />
    </div>
  )
}
