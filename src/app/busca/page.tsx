import { prisma } from '@/lib/prisma'
import { Navbar } from '@/components/layout/Navbar'
import { ProductCard } from '@/components/cards/ProductCard'
import Link from 'next/link'

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q || ''

  let produtos: any[] = []

  if (query.trim() !== '') {
    produtos = await prisma.produto.findMany({
      where: {
        ativo: true,
        OR: [
          { nome: { contains: query } },
          { descricao: { contains: query } },
          { sku: { contains: query } },
          { fragrancia: { contains: query } },
          { marca: { nome: { contains: query } } }
        ]
      },
      include: {
        imagens: { orderBy: { ordem: 'asc' } },
        categoria: true,
        marca: true
      }
    })
  }

  return (
    <>
      <Navbar />
      <main style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', minHeight: '60vh' }}>
        <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)', marginBottom: '10px' }}>Resultados da Busca</h1>
        
        {query ? (
          <p style={{ color: '#64748b', marginBottom: '30px' }}>
            Mostrando resultados para: <strong>&quot;{query}&quot;</strong> ({produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'})
          </p>
        ) : (
          <p style={{ color: '#64748b', marginBottom: '30px' }}>
            Digite um termo na barra de pesquisa para buscar produtos.
          </p>
        )}

        {query && produtos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Nenhum produto encontrado.</h2>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>Tente pesquisar por outros termos, fragrâncias ou marcas.</p>
            <Link href="/" style={{ padding: '10px 20px', backgroundColor: '#0f172a', color: '#fff', textDecoration: 'none', borderRadius: '4px' }}>
              Voltar para Home
            </Link>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
            gap: '30px', 
            marginTop: '30px' 
          }}>{produtos.map(produto => (
              <ProductCard key={produto.id} product={produto} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
