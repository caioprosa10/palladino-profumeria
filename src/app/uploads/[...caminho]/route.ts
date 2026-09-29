import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { getUploadDir } from '@/lib/upload'

/**
 * Serve as imagens enviadas pelo painel quando UPLOADS_DIR aponta para um
 * volume fora de public/ — em produção o disco da aplicação é recriado a
 * cada deploy, então os uploads não podem morar junto do código.
 *
 * Em desenvolvimento esta rota praticamente não é usada: arquivos reais em
 * public/uploads são servidos estaticamente pelo Next, que tem precedência
 * sobre rotas.
 */

const TIPOS: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
}

export async function GET(
  _req: Request,
  props: { params: Promise<{ caminho: string[] }> }
) {
  const { caminho } = await props.params

  const base = getUploadDir()
  const destino = path.resolve(base, ...caminho)

  // O caminho vem da URL. Sem esta checagem, "../../.env" sairia da pasta
  // de uploads e serviria qualquer arquivo do servidor.
  if (destino !== base && !destino.startsWith(base + path.sep)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const ext = path.extname(destino).toLowerCase()
  const tipo = TIPOS[ext]

  // Só imagens: nada de servir .html ou .svg, que executariam script na
  // origem do site.
  if (!tipo) {
    return new NextResponse('Not found', { status: 404 })
  }

  try {
    const arquivo = await fs.readFile(destino)
    return new NextResponse(new Uint8Array(arquivo), {
      headers: {
        'Content-Type': tipo,
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
