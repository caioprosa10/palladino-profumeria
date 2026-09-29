import { prisma } from '@/lib/prisma'
import ProductForm from '@/components/admin/ProductForm'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (!session) redirect('/login')

  const payload = await decrypt(session)
  if (!payload || (payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN')) {
    redirect('/minha-conta')
  }

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
