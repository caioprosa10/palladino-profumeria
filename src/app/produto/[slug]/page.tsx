import { prisma } from '@/lib/prisma'
import { Navbar } from '@/components/layout/Navbar'
import { notFound } from 'next/navigation'
import { ProductDetailsClient } from './ProductDetailsClient'

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const produto = await prisma.produto.findUnique({
    where: { slug },
    include: { marca: true }
  })
  
  if (!produto) return { title: 'Produto não encontrado' }
  
  return {
    title: `${produto.nome} - Palladino Profumeria`,
    description: produto.descricao_curta || produto.nome,
  }
}

export default async function ProdutoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  
  const produto = await prisma.produto.findUnique({
    where: { slug },
    include: {
      imagens: { orderBy: { ordem: 'asc' } },
      categoria: true,
      marca: true
    }
  })

  if (!produto || !produto.ativo) {
    notFound()
  }

  // Buscar produtos relacionados
  const relatedProducts = await prisma.produto.findMany({
    where: { 
      categoria_id: produto.categoria_id,
      id: { not: produto.id },
      ativo: true
    },
    take: 4,
    include: {
      imagens: { orderBy: { ordem: 'asc' }, take: 1 },
      marca: true
    }
  })

  return (
    <>
      <Navbar />
      <ProductDetailsClient produto={produto} relatedProducts={relatedProducts} />
    </>
  )
}
