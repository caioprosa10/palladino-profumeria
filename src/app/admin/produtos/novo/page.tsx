import { prisma } from '@/lib/prisma'
import ProductForm from '@/components/admin/ProductForm'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function NovoProdutoPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (!session) redirect('/login')

  const payload = await decrypt(session)
  if (!payload || (payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN')) {
    redirect('/minha-conta')
  }

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
