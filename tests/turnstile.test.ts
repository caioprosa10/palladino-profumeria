import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { ativo, siteKey, verificar, mensagemDeErro } from '@/lib/turnstile'

/**
 * Chaves de teste oficiais da Cloudflare.
 * https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */
const SEMPRE_PASSA = '1x0000000000000000000000000000000AA'
const SEMPRE_FALHA = '2x0000000000000000000000000000000AA'
const SITE_KEY_TESTE = '1x00000000000000000000AA'

const original = { ...process.env }

beforeEach(() => {
  delete process.env.TURNSTILE_SITE_KEY
  delete process.env.TURNSTILE_SECRET_KEY
})

afterAll(() => {
  process.env = original
})

function ligar(secret: string) {
  process.env.TURNSTILE_SITE_KEY = SITE_KEY_TESTE
  process.env.TURNSTILE_SECRET_KEY = secret
}

describe('turnstile: desativado por padrão', () => {
  it('ativo() é false sem as duas chaves', () => {
    expect(ativo()).toBe(false)

    process.env.TURNSTILE_SITE_KEY = SITE_KEY_TESTE
    expect(ativo()).toBe(false) // falta a secret

    delete process.env.TURNSTILE_SITE_KEY
    process.env.TURNSTILE_SECRET_KEY = SEMPRE_PASSA
    expect(ativo()).toBe(false) // falta a site key
  })

  it('siteKey() é null quando não configurado', () => {
    expect(siteKey()).toBeNull()
  })

  it('não bloqueia nada quando desativado, mesmo sem token', async () => {
    const r = await verificar(undefined, '1.2.3.4', { failClosed: true })

    expect(r).toEqual({ ok: false, motivo: 'desativado' })
    // 'desativado' não vira erro para o cliente.
    expect(mensagemDeErro(r)).toBeNull()
  })
})

describe('turnstile: ativo', () => {
  it('aceita token válido usando a chave que sempre passa', async () => {
    ligar(SEMPRE_PASSA)

    const r = await verificar('qualquer-token', '1.2.3.4', { failClosed: true })

    expect(r.ok).toBe(true)
    expect(mensagemDeErro(r)).toBeNull()
  }, 15000)

  it('recusa usando a chave que sempre falha', async () => {
    ligar(SEMPRE_FALHA)

    const r = await verificar('qualquer-token', '1.2.3.4', { failClosed: true })

    expect(r).toEqual({ ok: false, motivo: 'invalido' })
    expect(mensagemDeErro(r)).toContain('Verificação de segurança falhou')
  }, 15000)

  it('recusa quando o token não vem', async () => {
    ligar(SEMPRE_PASSA)

    const r = await verificar('', '1.2.3.4', { failClosed: true })

    expect(r).toEqual({ ok: false, motivo: 'ausente' })
    expect(mensagemDeErro(r)).toBeTruthy()
  })

  it('siteKey() devolve a chave pública quando configurado', () => {
    ligar(SEMPRE_PASSA)
    expect(siteKey()).toBe(SITE_KEY_TESTE)
  })
})

describe('turnstile: provedor indisponível', () => {
  /** Aponta o siteverify para um endereço que não responde. */
  function simularQueda() {
    ligar(SEMPRE_PASSA)
    const fetchOriginal = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new Error('rede indisponível')
    }) as typeof fetch
    return () => {
      globalThis.fetch = fetchOriginal
    }
  }

  it('failClosed: true bloqueia (cadastro, recuperação)', async () => {
    const restaurar = simularQueda()
    try {
      const r = await verificar('token', '1.2.3.4', { failClosed: true })

      expect(r).toEqual({ ok: false, motivo: 'indisponivel' })
      expect(mensagemDeErro(r)).toContain('Tente novamente')
    } finally {
      restaurar()
    }
  })

  it('failClosed: false libera e deixa as outras defesas agirem (login)', async () => {
    const restaurar = simularQueda()
    try {
      const r = await verificar('token', '1.2.3.4', { failClosed: false })

      // Trata como desativado: não impede o login.
      expect(r).toEqual({ ok: false, motivo: 'desativado' })
      expect(mensagemDeErro(r)).toBeNull()
    } finally {
      restaurar()
    }
  })

  it('respeita o timeout em vez de prender a requisição', async () => {
    ligar(SEMPRE_PASSA)
    const fetchOriginal = globalThis.fetch
    globalThis.fetch = ((_u: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        // Reproduz o aborto disparado pelo AbortSignal.timeout.
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
      })) as typeof fetch

    try {
      const inicio = Date.now()
      const r = await verificar('token', '1.2.3.4', { failClosed: true })

      expect(r.ok).toBe(false)
      expect(Date.now() - inicio).toBeLessThan(8000)
    } finally {
      globalThis.fetch = fetchOriginal
    }
  }, 15000)
})
