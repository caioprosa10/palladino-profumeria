import { NextResponse } from 'next/server'
import { lerImagem } from '@/lib/upload'

/**
 * Serve as imagens enviadas pelo painel, que ficam no banco.
 *
 * As imagens do catálogo que vieram versionadas seguem em public/uploads e
 * são atendidas estaticamente — o Next serve public/ antes das rotas —,
 * então esta rota só responde pelo que foi enviado depois.
 */

/** Só imagens: .html ou .svg servidos daqui executariam script na origem. */
const TIPOS_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
])

export async function GET(
  _req: Request,
  props: { params: Promise<{ caminho: string[] }> }
) {
  const { caminho } = await props.params

  // O nome é um único segmento gerado pelo servidor. Recusar caminhos com
  // mais de um nível elimina qualquer tentativa de travessia antes de a
  // consulta acontecer.
  if (caminho.length !== 1) {
    return new NextResponse('Not found', { status: 404 })
  }

  const nome = caminho[0]

  // Formato exato do que geramos em saveImage.
  if (!/^\d+-[0-9a-f]{12}\.(jpg|png|gif|webp|avif)$/.test(nome)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const arquivo = await lerImagem(nome)

  if (!arquivo || !TIPOS_PERMITIDOS.has(arquivo.tipo)) {
    return new NextResponse('Not found', { status: 404 })
  }

  return new NextResponse(new Uint8Array(arquivo.conteudo), {
    headers: {
      'Content-Type': arquivo.tipo,
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      // Mesmo que algo escapasse da validação, nada executa daqui.
      'Content-Security-Policy': "default-src 'none'; sandbox",
      // O nome carrega timestamp e aleatório, então o conteúdo nunca muda.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
