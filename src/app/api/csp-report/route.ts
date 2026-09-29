import { NextResponse } from 'next/server'
import { SecurityService } from '@/services/security.service'
import { ipDaRequisicao } from '@/lib/validacao'

/**
 * Recebe as violações da política publicada em Content-Security-Policy-Report-Only.
 *
 * Serve para medir o que uma política estrita quebraria antes de passar a
 * bloquear de fato. O endpoint é público por necessidade — é o navegador
 * de quem visita que envia —, então tem rate limit: sem ele qualquer um
 * poderia inundar o log e o banco.
 *
 * Só registra a diretiva violada e o recurso bloqueado. Nunca o corpo do
 * script nem a URL completa da página, que poderiam conter dados do
 * usuário em parâmetros de consulta.
 */

const LIMITE_POR_IP = 30
const TAMANHO_MAXIMO = 8 * 1024

interface Violacao {
  'violated-directive'?: string
  'effective-directive'?: string
  'blocked-uri'?: string
  'document-uri'?: string
}

/** Descarta query string e fragmento, que podem carregar dados pessoais. */
function caminhoLimpo(uri: string | undefined): string {
  if (!uri) return '(desconhecido)'
  try {
    const u = new URL(uri)
    return u.origin === 'null' ? u.pathname : u.origin + u.pathname
  } catch {
    // Valores como 'inline', 'eval' ou 'data' não são URLs.
    return uri.slice(0, 80)
  }
}

export async function POST(req: Request) {
  const ip = ipDaRequisicao(req)

  if (await SecurityService.checkRateLimit(ip, '/api/csp-report', LIMITE_POR_IP)) {
    // 204 e não 429: a especificação não define retentativa, e responder
    // erro só faria o navegador insistir.
    return new NextResponse(null, { status: 204 })
  }

  try {
    const texto = await req.text()
    if (texto.length > TAMANHO_MAXIMO) {
      return new NextResponse(null, { status: 204 })
    }

    const bruto = JSON.parse(texto)

    // Dois formatos convivem: o antigo {"csp-report": {...}} e o novo
    // Reporting API, que manda um array de {type, body}.
    const violacoes: Violacao[] = Array.isArray(bruto)
      ? bruto.map((r: { body?: Violacao }) => r.body ?? {})
      : [bruto['csp-report'] ?? bruto]

    for (const v of violacoes) {
      const diretiva = v['effective-directive'] || v['violated-directive'] || '(sem diretiva)'
      console.warn(
        `[CSP] ${diretiva} bloquearia ${caminhoLimpo(v['blocked-uri'])} em ${caminhoLimpo(v['document-uri'])}`
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch {
    // Relatório malformado não é motivo para erro visível.
    return new NextResponse(null, { status: 204 })
  }
}
