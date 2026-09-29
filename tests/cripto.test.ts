import { describe, it, expect } from 'vitest'
import { cifrar, decifrar, estaCifrado, hashToken, gerarToken } from '@/lib/cripto'

describe('cripto', () => {
  it('decifra para o valor original', () => {
    const c = cifrar('APP_USR-segredo-123')!
    expect(decifrar(c)).toBe('APP_USR-segredo-123')
  })

  it('marca o valor cifrado com o prefixo de versão', () => {
    expect(cifrar('x')!.startsWith('enc:v1:')).toBe(true)
    expect(estaCifrado(cifrar('x'))).toBe(true)
    expect(estaCifrado('texto em claro')).toBe(false)
  })

  it('usa IV novo a cada chamada', () => {
    expect(cifrar('mesmo valor')).not.toBe(cifrar('mesmo valor'))
  })

  it('é idempotente: cifrar duas vezes não empilha', () => {
    const uma = cifrar('valor')!
    expect(cifrar(uma)).toBe(uma)
  })

  it('devolve null para vazio e nulo', () => {
    expect(cifrar(null)).toBeNull()
    expect(cifrar('')).toBeNull()
    expect(decifrar(null)).toBeNull()
  })

  it('devolve texto legado em claro sem alterar', () => {
    expect(decifrar('cpf-antigo-em-claro')).toBe('cpf-antigo-em-claro')
  })

  it('recusa valor adulterado (autenticação do GCM)', () => {
    const c = cifrar('valor')!
    expect(decifrar(c.slice(0, -6) + 'AAAAAA')).toBeNull()
  })

  it('hashToken é estável e não reversível ao valor', () => {
    const t = gerarToken()
    expect(hashToken(t)).toBe(hashToken(t))
    expect(hashToken(t)).not.toContain(t)
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/)
  })
})
