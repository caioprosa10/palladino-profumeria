/**
 * Cloudflare Turnstile.
 *
 * Fica inteiro atrás de variável de ambiente: sem TURNSTILE_SITE_KEY e
 * TURNSTILE_SECRET_KEY, `ativo()` devolve false e a proteção continua
 * sendo o honeypot mais o rate limit, como antes.
 */

const URL_SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** A Cloudflare pode estar lenta; não prendemos a requisição do cliente. */
const TIMEOUT_MS = 5000

export type Resultado =
  | { ok: true }
  | { ok: false; motivo: 'desativado' | 'ausente' | 'invalido' | 'indisponivel' }

export function ativo(): boolean {
  return Boolean(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY)
}

export function siteKey(): string | null {
  return process.env.TURNSTILE_SITE_KEY || null
}

/**
 * Valida o token no servidor. Validar só no navegador não protege nada:
 * o cliente é quem manda a requisição.
 *
 * `failClosed` decide o que fazer quando a Cloudflare não responde:
 * - true  → bloqueia (cadastro e recuperação de senha);
 * - false → libera e segue para as outras defesas (login).
 */
export async function verificar(
  token: string | undefined | null,
  ip: string | undefined,
  opcoes: { failClosed: boolean }
): Promise<Resultado> {
  if (!ativo()) return { ok: false, motivo: 'desativado' }

  if (!token) return { ok: false, motivo: 'ausente' }

  const corpo = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY!,
    response: token,
  })
  if (ip) corpo.set('remoteip', ip)

  try {
    const resposta = await fetch(URL_SITEVERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: corpo,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!resposta.ok) {
      return { ok: false, motivo: opcoes.failClosed ? 'indisponivel' : 'desativado' }
    }

    const dados = (await resposta.json()) as { success?: boolean }

    return dados.success ? { ok: true } : { ok: false, motivo: 'invalido' }
  } catch {
    // Timeout ou falha de rede. Nunca registramos o token.
    console.warn('⚠️ Turnstile indisponível na verificação.')
    return { ok: false, motivo: opcoes.failClosed ? 'indisponivel' : 'desativado' }
  }
}

/**
 * Traduz o resultado em erro para o cliente, ou null quando pode seguir.
 *
 * 'desativado' passa: é o caso de a integração não estar configurada, ou
 * de o provedor ter falhado numa rota que optou por não bloquear.
 */
export function mensagemDeErro(r: Resultado): string | null {
  if (r.ok || r.motivo === 'desativado') return null

  if (r.motivo === 'indisponivel') {
    return 'Não foi possível concluir a verificação de segurança. Tente novamente em instantes.'
  }

  return 'Verificação de segurança falhou. Recarregue a página e tente de novo.'
}
