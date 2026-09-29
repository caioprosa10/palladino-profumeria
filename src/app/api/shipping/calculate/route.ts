import { NextResponse } from 'next/server'
import { shippingService } from '@/services/MelhorEnvioService'

export async function POST(request: Request) {
  try {
    const { cepDestino, cart } = await request.json()

    if (!cepDestino || !cart || cart.length === 0) {
      return NextResponse.json({ error: 'CEP de destino e carrinho são obrigatórios.' }, { status: 400 })
    }

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
