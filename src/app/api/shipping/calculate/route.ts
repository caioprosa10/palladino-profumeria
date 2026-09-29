import { NextResponse } from 'next/server'
import { z } from 'zod'
import { SecurityService } from '@/services/security.service'
import { lerCorpo, respostaDeCorpoInvalido, ipDaRequisicao } from '@/lib/validacao'

const freteSchema = z.object({
  cepDestino: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  cart: z
    .array(
      z.object({
        produto: z.object({ id: z.string().min(1).max(64) }).passthrough(),
        quantidade: z.number().int().min(1).max(99),
      })
    )
    .min(1, 'Carrinho vazio')
    .max(50),
})
import { shippingService } from '@/services/MelhorEnvioService'

export async function POST(request: Request) {
  try {
    // Cada chamada consome cota da API do Melhor Envio e do ViaCEP:
    // sem limite, um terceiro pode esgotar o serviço de frete da loja.
    const ip = ipDaRequisicao(request)
    if (await SecurityService.checkRateLimit(ip, '/api/shipping/calculate', 20)) {
      return NextResponse.json(
        { error: 'Muitas consultas de frete. Aguarde alguns minutos.' },
        { status: 429 }
      )
    }

    const { cepDestino, cart } = await lerCorpo(request, freteSchema)

    const produtos = cart.map((item: any) => ({
      id: item.produto.id,
      width: 15, // Fallbacks
      height: 15,
      length: 15,
      weight: item.produto.peso || 0.5,
      insurance_value: item.produto.preco,
      quantity: item.quantidade
    }))

    const options = await shippingService.calculate({
      cepDestino,
      produtos
    })

    return NextResponse.json(options)
  } catch (error: any) {
    const r = respostaDeCorpoInvalido(error)
    if (r) return r
    console.error('Erro na rota de frete:', error)
    
    // Tratamento amigável
    if (error.message === 'CONFIG_MISSING') {
      return NextResponse.json({ error: 'Sistema de fretes temporariamente indisponível (Token não configurado).' }, { status: 503 })
    }
    if (error.message === 'CEP_INVALID' || error.message === 'CEP_NOT_FOUND') {
      return NextResponse.json({ error: 'CEP inválido ou não encontrado.' }, { status: 400 })
    }
    if (error.message === 'NO_CARRIERS') {
      return NextResponse.json({ error: 'Nenhuma transportadora atende essa região ou peso excedido.' }, { status: 404 })
    }
    if (error.message.startsWith('VALIDATION_ERROR:')) {
      return NextResponse.json({ error: error.message.replace('VALIDATION_ERROR: ', '') }, { status: 422 })
    }
    
    return NextResponse.json({ error: 'Sistema de fretes indisponível no momento. Tente novamente.' }, { status: 500 })
  }
}
