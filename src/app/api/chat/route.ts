import { NextResponse } from 'next/server'
import { z } from 'zod'
import { SecurityService } from '@/services/security.service'
import { lerCorpo, respostaDeCorpoInvalido, ipDaRequisicao } from '@/lib/validacao'

// As preferências são rótulos curtos escolhidos na interface do chatbot.
const chatSchema = z.object({
  preferences: z.record(z.string().max(40), z.string().max(80)).optional(),
})
import { prisma } from '@/lib/prisma'
import { RecommendationEngine } from '@/lib/chatbot/engine'

export async function POST(req: Request) {
  try {
    const ip = ipDaRequisicao(req)
    if (await SecurityService.checkRateLimit(ip, '/api/chat', 30)) {
      return NextResponse.json(
        { error: 'Muitas requisições. Aguarde alguns minutos e tente novamente.' },
        { status: 429 }
      )
    }

    const { preferences } = await lerCorpo(req, chatSchema)
    
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
    const r = respostaDeCorpoInvalido(error)
    if (r) return r
    console.error('[Chatbot API] Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar recomendações.' }, { status: 500 })
  }
}
