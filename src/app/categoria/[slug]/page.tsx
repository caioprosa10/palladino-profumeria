import { prisma } from '@/lib/prisma'
import { Navbar } from '@/components/layout/Navbar'
import { ProductCard } from '@/components/cards/ProductCard'
import { notFound } from 'next/navigation'

export const revalidate = 60 // Revalida a cada 1 minuto (ISR) para garantir que novos produtos apareçam automaticamente

export default async function CategoriaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  
  const categoria = await prisma.categoria.findUnique({
    where: { slug }
  })

  if (!categoria) {
    notFound()
  }

  const produtos = await prisma.produto.findMany({
    where: {
      categoria_id: categoria.id,
      ativo: true
    },
    include: {
      imagens: { orderBy: { ordem: 'asc' } },
      categoria: true,
      marca: true
    }
  })

  return (
    <>
      <Navbar />
      <main style={{ padding: '140px 20px 60px', maxWidth: '1200px', margin: '0 auto', minHeight: '60vh' }}>
        <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-serif)', marginBottom: '10px' }}>
          {categoria.nome}
        </h1>
        <p style={{ color: '#64748b', marginBottom: '40px' }}>
          Explore nossa seleção exclusiva de {categoria.nome.toLowerCase()}.
        </p>

        {produtos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Nenhum produto encontrado.</h2>
            <p style={{ color: '#64748b' }}>Ainda não temos produtos cadastrados nesta categoria.</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
            gap: '30px', 
            marginTop: '40px' 
          }}>
            {produtos.map(produto => (
              <ProductCard key={produto.id} product={produto} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
