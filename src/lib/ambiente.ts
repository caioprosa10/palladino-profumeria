/**
 * Validação das variáveis de ambiente.
 *
 * Em produção, faltar uma variável crítica não deve virar comportamento
 * silencioso e inseguro: `JWT_SECRET` ausente já é erro, `APP_URL`
 * ausente fazia o link de redefinição de senha cair no header Host — que
 * o cliente controla — e `ENCRYPTION_KEY` ausente quebra a leitura de
 * dados cifrados.
 */

export interface Problema {
  variavel: string
  mensagem: string
}

const MIN_JWT = 32
const MIN_CHAVE = 32

/** Segredos previsíveis que não devem passar por descuido. */
const FRACOS = [
  'changeme',
  'change-me',
  'secret',
  'password',
  'mudar',
  'test',
  'teste',
  'development',
  'desenvolvimento',
]

function pareceFraco(valor: string): boolean {
  const v = valor.toLowerCase()
  return FRACOS.some((f) => v.includes(f))
}

/** Variáveis obrigatórias, com o motivo de cada uma. */
export function verificarObrigatorias(env = process.env): Problema[] {
  const problemas: Problema[] = []

  const jwt = env.JWT_SECRET
  if (!jwt) {
    problemas.push({
      variavel: 'JWT_SECRET',
      mensagem: 'ausente. Gere com `openssl rand -base64 48`.',
    })
  } else if (jwt.length < MIN_JWT) {
    problemas.push({
      variavel: 'JWT_SECRET',
      mensagem: `tem ${jwt.length} caracteres; o mínimo é ${MIN_JWT}.`,
    })
  } else if (pareceFraco(jwt)) {
    problemas.push({
      variavel: 'JWT_SECRET',
      mensagem: 'parece ser um valor de exemplo. Gere um aleatório.',
    })
  }

  const chave = env.ENCRYPTION_KEY
  if (!chave) {
    problemas.push({
      variavel: 'ENCRYPTION_KEY',
      mensagem: 'ausente. Gere com `openssl rand -base64 32`.',
    })
  } else if (chave.length < MIN_CHAVE) {
    problemas.push({
      variavel: 'ENCRYPTION_KEY',
      mensagem: `tem ${chave.length} caracteres; o mínimo é ${MIN_CHAVE}.`,
    })
  } else if (pareceFraco(chave)) {
    problemas.push({
      variavel: 'ENCRYPTION_KEY',
      mensagem: 'parece ser um valor de exemplo. Gere um aleatório.',
    })
  }

  const url = env.APP_URL
  if (!url) {
    problemas.push({
      variavel: 'APP_URL',
      mensagem:
        'ausente. Sem ela, os links de e-mail dependeriam do header Host, que o cliente controla.',
    })
  } else {
    try {
      const u = new URL(url)
      if (u.protocol !== 'https:' && u.hostname !== 'localhost') {
        problemas.push({
          variavel: 'APP_URL',
          mensagem: 'deve usar https em produção.',
        })
      }
    } catch {
      problemas.push({ variavel: 'APP_URL', mensagem: 'não é uma URL válida.' })
    }
  }

  return problemas
}

/**
 * Variáveis que o Next resolve durante `next build` e grava no
 * routes-manifest — definir apenas em tempo de execução não tem efeito.
 * Não são obrigatórias; a lista existe para o aviso ser específico.
 */
export const VARIAVEIS_DE_BUILD = [
  'TURNSTILE_SITE_KEY',
  'CSP_REPORT_ONLY',
  'DISABLE_HTTPS_UPGRADE',
] as const

/** Opcionais cuja ausência degrada uma funcionalidade sem quebrar o app. */
export function verificarOpcionais(env = process.env): string[] {
  const avisos: string[] = []

  const smtp = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']
  const faltando = smtp.filter((v) => !env[v])

  if (faltando.length === smtp.length) {
    avisos.push(
      'SMTP não configurado: e-mails transacionais e o link de redefinição de senha não serão entregues.'
    )
  } else if (faltando.length > 0) {
    avisos.push(`SMTP incompleto — faltam: ${faltando.join(', ')}.`)
  }

  if (!env.MP_ACCESS_TOKEN) {
    avisos.push('MP_ACCESS_TOKEN não configurado: o checkout não processa pagamentos.')
  }

  if (!env.TURNSTILE_SITE_KEY || !env.TURNSTILE_SECRET_KEY) {
    avisos.push('Turnstile desativado: a proteção contra robôs é o honeypot e o rate limit.')
  }

  return avisos
}

/**
 * Chamado uma vez no boot. Em produção, interrompe se faltar algo
 * crítico; em desenvolvimento apenas avisa, para não travar o trabalho.
 */
export function validarAmbiente(env = process.env): void {
  const producao = env.NODE_ENV === 'production'
  const problemas = verificarObrigatorias(env)

  if (problemas.length > 0) {
    const lista = problemas.map((p) => `  - ${p.variavel}: ${p.mensagem}`).join('\n')

    if (producao) {
      throw new Error(
        `Configuração inválida. Corrija antes de subir:\n${lista}\n\n` +
          `Ver docs/operacao.md.`
      )
    }

    console.warn(`\n⚠️  Variáveis de ambiente com problema:\n${lista}\n`)
  }

  for (const aviso of verificarOpcionais(env)) {
    console.warn(`⚠️  ${aviso}`)
  }
}
