import { describe, it, expect } from 'vitest'
import { verificarObrigatorias, verificarOpcionais, validarAmbiente, VARIAVEIS_DE_BUILD } from '@/lib/ambiente'

const VALIDO = {
  JWT_SECRET: 'x'.repeat(48),
  ENCRYPTION_KEY: 'k'.repeat(44),
  APP_URL: 'https://palladinoprofumeria.com.br',
}

function env(extra: Record<string, string | undefined> = {}) {
  return { ...VALIDO, ...extra } as unknown as NodeJS.ProcessEnv
}

describe('variáveis obrigatórias', () => {
  it('não reclama de uma configuração válida', () => {
    expect(verificarObrigatorias(env())).toEqual([])
  })

  it('exige JWT_SECRET', () => {
    const p = verificarObrigatorias(env({ JWT_SECRET: undefined }))
    expect(p.map((x) => x.variavel)).toContain('JWT_SECRET')
  })

  it('recusa JWT_SECRET curto', () => {
    const p = verificarObrigatorias(env({ JWT_SECRET: 'curto' }))
    expect(p[0].mensagem).toContain('mínimo')
  })

  it('recusa segredo previsível', () => {
    for (const fraco of ['changeme-changeme-changeme-changeme', 'senha-de-desenvolvimento-aqui-ok-1']) {
      const p = verificarObrigatorias(env({ JWT_SECRET: fraco }))
      expect(p.length, fraco).toBeGreaterThan(0)
    }
  })

  it('exige ENCRYPTION_KEY', () => {
    const p = verificarObrigatorias(env({ ENCRYPTION_KEY: undefined }))
    expect(p.map((x) => x.variavel)).toContain('ENCRYPTION_KEY')
  })

  it('exige APP_URL e explica o motivo', () => {
    const p = verificarObrigatorias(env({ APP_URL: undefined }))
    const appUrl = p.find((x) => x.variavel === 'APP_URL')!
    // O motivo importa: é o que evita host header injection.
    expect(appUrl.mensagem).toContain('Host')
  })

  it('exige https em APP_URL, aceitando localhost', () => {
    expect(verificarObrigatorias(env({ APP_URL: 'http://exemplo.com' })).length).toBe(1)
    expect(verificarObrigatorias(env({ APP_URL: 'http://localhost:3000' }))).toEqual([])
  })

  it('recusa APP_URL malformada', () => {
    const p = verificarObrigatorias(env({ APP_URL: 'nao-e-url' }))
    expect(p[0].mensagem).toContain('válida')
  })
})

describe('variáveis opcionais', () => {
  it('avisa quando o SMTP está ausente por completo', () => {
    const avisos = verificarOpcionais(env())
    expect(avisos.join(' ')).toContain('SMTP não configurado')
  })

  it('distingue SMTP incompleto de ausente', () => {
    const avisos = verificarOpcionais(env({ SMTP_HOST: 'smtp.exemplo.com', SMTP_PORT: '587' }))
    const texto = avisos.join(' ')
    expect(texto).toContain('SMTP incompleto')
    expect(texto).toContain('SMTP_USER')
  })

  it('avisa sobre pagamento e Turnstile desligados', () => {
    const texto = verificarOpcionais(env()).join(' ')
    expect(texto).toContain('MP_ACCESS_TOKEN')
    expect(texto).toContain('Turnstile')
  })
})

describe('comportamento no boot', () => {
  it('em produção, interrompe com mensagem acionável', () => {
    expect(() =>
      validarAmbiente(env({ NODE_ENV: 'production', JWT_SECRET: undefined }) as unknown as NodeJS.ProcessEnv)
    ).toThrow(/JWT_SECRET/)

    expect(() =>
      validarAmbiente(env({ NODE_ENV: 'production', APP_URL: undefined }) as unknown as NodeJS.ProcessEnv)
    ).toThrow(/operacao\.md/)
  })

  it('em desenvolvimento, apenas avisa', () => {
    const original = console.warn
    const linhas: string[] = []
    console.warn = (...a: unknown[]) => linhas.push(a.join(' '))

    try {
      expect(() =>
        validarAmbiente(env({ NODE_ENV: 'development', JWT_SECRET: undefined }) as unknown as NodeJS.ProcessEnv)
      ).not.toThrow()
      expect(linhas.join('\n')).toContain('JWT_SECRET')
    } finally {
      console.warn = original
    }
  })

  it('nunca escreve o valor do segredo na mensagem', () => {
    const segredo = 'valor-real-do-segredo-que-nao-pode-vazar-123'
    try {
      validarAmbiente(env({ NODE_ENV: 'production', APP_URL: undefined, JWT_SECRET: segredo }) as unknown as NodeJS.ProcessEnv)
    } catch (e) {
      expect((e as Error).message).not.toContain(segredo)
    }
  })

  it('lista as variáveis lidas no build', () => {
    expect(VARIAVEIS_DE_BUILD).toContain('TURNSTILE_SITE_KEY')
    expect(VARIAVEIS_DE_BUILD).toContain('CSP_REPORT_ONLY')
  })
})
