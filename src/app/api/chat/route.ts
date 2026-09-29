import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { RecommendationEngine } from '@/lib/chatbot/engine'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { preferences } = body
    
    // Buscar todos os produtos disponíveis no banco
    const activeProducts = await prisma.produto.findMany({
      where: { 
        ativo: true, 
        estoque: { gt: 0 } 
      },
      include: {
        marca: true,
        categoria: true
      }
    })

    if (!activeProducts || activeProducts.length === 0) {
      return NextResponse.json({ products: [], level: 5, message: "empty_db" })
    }

    // Passa a responsabilidade 100% para o novo Motor de Recomendação Modular
    const engineResult = RecommendationEngine.run(activeProducts, preferences || {});

    return NextResponse.json(engineResult)

  } catch (error) {
    console.error('[Chatbot API] Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar recomendações.' }, { status: 500 })
  }
}
