import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'
import { estaCifrado, decifrar } from '@/lib/cripto'
import { migrar, fazerBackup } from '../scripts/migrar-criptografia'

const prisma = new PrismaClient()

/** Grava direto no banco para simular dados antigos, em claro. */
async function semCifrar(tabela: string, coluna: string, id: string, valor: string) {
  // Postgres usa $1/$2; o `?` do SQLite daria erro de sintaxe.
  await prisma.$executeRawUnsafe(`UPDATE "${tabela}" SET "${coluna}" = $1 WHERE id = $2`, valor, id)
}

beforeAll(() => {
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  })
})

beforeEach(async () => {
  await prisma.tokenIntegracao.deleteMany({})
  await prisma.configuracaoFrete.deleteMany({})
  await prisma.user.deleteMany({})
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('migrar-criptografia', () => {
  it('cifra CPF que está em claro e o mantém legível', async () => {
    const u = await prisma.user.create({
      data: { nome: 'A', email: 'a@t.com', senha: 'hash', cpf: 'placeholder' },
    })
    await semCifrar('User', 'cpf', u.id, '12345678901')

    const r = await migrar(prisma, { silencioso: true })

    expect(r.cifrados).toBe(1)
    expect(r.falhas).toEqual([])
    expect(r.verificados).toBe(1)

    const depois = await prisma.user.findUnique({ where: { id: u.id } })
    expect(estaCifrado(depois!.cpf)).toBe(true)
    expect(decifrar(depois!.cpf)).toBe('12345678901')
  })

  it('é idempotente: a segunda passada não cifra nada', async () => {
    const u = await prisma.user.create({
      data: { nome: 'B', email: 'b@t.com', senha: 'hash', cpf: 'x' },
    })
    await semCifrar('User', 'cpf', u.id, '98765432100')

    const primeira = await migrar(prisma, { silencioso: true })
    const cifradoApos1 = (await prisma.user.findUnique({ where: { id: u.id } }))!.cpf

    const segunda = await migrar(prisma, { silencioso: true })
    const cifradoApos2 = (await prisma.user.findUnique({ where: { id: u.id } }))!.cpf

    expect(primeira.cifrados).toBe(1)
    expect(segunda.cifrados).toBe(0)
    // Não recifrou: o valor guardado é exatamente o mesmo.
    expect(cifradoApos2).toBe(cifradoApos1)
    expect(decifrar(cifradoApos2)).toBe('98765432100')
  })

  it('--dry-run conta sem alterar nada', async () => {
    const u = await prisma.user.create({
      data: { nome: 'C', email: 'c@t.com', senha: 'hash', cpf: 'x' },
    })
    await semCifrar('User', 'cpf', u.id, '11122233344')

    const r = await migrar(prisma, { dryRun: true, silencioso: true })

    expect(r.cifrados).toBe(1)
    // Continua em claro: nada foi gravado.
    const depois = await prisma.user.findUnique({ where: { id: u.id } })
    expect(estaCifrado(depois!.cpf)).toBe(false)
    expect(depois!.cpf).toBe('11122233344')
  })

  it('cobre credenciais de frete e tokens de integração', async () => {
    const cfg = await prisma.configuracaoFrete.create({ data: { token: 'x', clientSecret: 'y' } })
    await semCifrar('ConfiguracaoFrete', 'token', cfg.id, 'token-melhor-envio')
    await semCifrar('ConfiguracaoFrete', 'clientSecret', cfg.id, 'segredo-cliente')

    const tk = await prisma.tokenIntegracao.create({ data: { titulo: 'T', token: 'z' } })
    await semCifrar('TokenIntegracao', 'token', tk.id, 'token-api-externa')

    const r = await migrar(prisma, { silencioso: true })

    expect(r.cifrados).toBe(3)
    expect(r.falhas).toEqual([])

    const cfgDepois = await prisma.configuracaoFrete.findUnique({ where: { id: cfg.id } })
    expect(decifrar(cfgDepois!.token)).toBe('token-melhor-envio')
    expect(decifrar(cfgDepois!.clientSecret)).toBe('segredo-cliente')

    const tkDepois = await prisma.tokenIntegracao.findUnique({ where: { id: tk.id } })
    expect(decifrar(tkDepois!.token)).toBe('token-api-externa')
  })

  it('cifra segredo e códigos de backup do 2FA', async () => {
    const u = await prisma.user.create({
      data: { nome: 'D', email: 'd@t.com', senha: 'hash', totpSecret: 'x', totpBackup: 'y' },
    })
    await semCifrar('User', 'totpSecret', u.id, 'SEGREDOTOTP123')
    await semCifrar('User', 'totpBackup', u.id, 'AAAAA-BBBBB,CCCCC-DDDDD')

    const r = await migrar(prisma, { silencioso: true })

    expect(r.cifrados).toBe(2)
    const depois = await prisma.user.findUnique({ where: { id: u.id } })
    expect(decifrar(depois!.totpSecret)).toBe('SEGREDOTOTP123')
    expect(decifrar(depois!.totpBackup)).toBe('AAAAA-BBBBB,CCCCC-DDDDD')
  })

  it('processa mais de um lote sem perder registros', async () => {
    // LOTE é 100; 150 força duas transações.
    for (let i = 0; i < 150; i++) {
      const u = await prisma.user.create({
        data: { nome: `U${i}`, email: `u${i}@t.com`, senha: 'hash', cpf: 'x' },
      })
      await semCifrar('User', 'cpf', u.id, `cpf-${i}`)
    }

    const r = await migrar(prisma, { silencioso: true })

    expect(r.cifrados).toBe(150)
    expect(r.verificados).toBe(150)
    expect(r.falhas).toEqual([])

    const amostra = await prisma.user.findFirst({ where: { email: 'u149@t.com' } })
    expect(decifrar(amostra!.cpf)).toBe('cpf-149')
  })

  it('ignora registros nulos', async () => {
    await prisma.user.create({ data: { nome: 'E', email: 'e@t.com', senha: 'hash' } })
    const r = await migrar(prisma, { silencioso: true })
    expect(r.cifrados).toBe(0)
  })

  it('gera backup cifrado antes de alterar', async () => {
    const destino = await fazerBackup()

    expect(destino).toBeTruthy()
    expect(fs.existsSync(destino!)).toBe(true)
    // Precisa ter conteúdo, e estar cifrado — não um despejo em claro.
    expect(fs.statSync(destino!).size).toBeGreaterThan(0)
    expect(fs.readFileSync(destino!).subarray(0, 5).toString()).toBe('PPBK2')

    fs.unlinkSync(destino!)
  }, 60000)

  it('não escreve valores sensíveis no log', async () => {
    const u = await prisma.user.create({
      data: { nome: 'F', email: 'f@t.com', senha: 'hash', cpf: 'x' },
    })
    await semCifrar('User', 'cpf', u.id, 'CPF-SUPER-SECRETO-999')

    const linhas: string[] = []
    const original = console.log
    console.log = (...a: unknown[]) => linhas.push(a.join(' '))

    try {
      await migrar(prisma, {})
    } finally {
      console.log = original
    }

    const tudo = linhas.join('\n')
    expect(tudo).not.toContain('CPF-SUPER-SECRETO-999')
    // Mas conta o que fez.
    expect(tudo).toContain('User.cpf')
  })
})
