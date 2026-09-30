import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { gerarBackup, limparAntigos, retencaoDias, SUFIXO } from '../scripts/backup'
import { decifrarBackup, verificarIntegridade } from '../scripts/restaurar'

const prisma = new PrismaClient()
const tmp = path.join(os.tmpdir(), 'palladino-teste-backup')

beforeAll(() => {
  execSync('npx prisma migrate deploy', { stdio: 'pipe' })
})

beforeEach(async () => {
  fs.rmSync(tmp, { recursive: true, force: true })
  fs.mkdirSync(tmp, { recursive: true })
  await prisma.user.deleteMany({})
})

afterAll(async () => {
  fs.rmSync(tmp, { recursive: true, force: true })
  await prisma.$disconnect()
})

describe('backup', () => {
  it('gera um arquivo cifrado', async () => {
    const r = await gerarBackup({ destino: tmp })

    expect(fs.existsSync(r.arquivo)).toBe(true)
    expect(r.bytes).toBeGreaterThan(0)
    expect(r.arquivo.endsWith(SUFIXO)).toBe(true)

    // Não é um SQLite em claro: o cabeçalho é nosso, não 'SQLite format 3'.
    const inicio = fs.readFileSync(r.arquivo).subarray(0, 16).toString('binary')
    expect(inicio).not.toContain('SQLite format')
    expect(inicio.startsWith('PPBK1')).toBe(true)
  })

  it('recusa gerar backup sem ENCRYPTION_KEY, em vez de gravar em claro', async () => {
    const guardada = process.env.ENCRYPTION_KEY
    delete process.env.ENCRYPTION_KEY

    try {
      await expect(gerarBackup({ destino: tmp })).rejects.toThrow(/ENCRYPTION_KEY/)
    } finally {
      process.env.ENCRYPTION_KEY = guardada
    }
  })

  it('não deixa a cópia intermediária em claro na pasta de backups', async () => {
    await gerarBackup({ destino: tmp })

    const arquivos = fs.readdirSync(tmp)
    // Só o .db.enc; nada de .db solto.
    expect(arquivos.every((a) => a.endsWith(SUFIXO))).toBe(true)
  })

  it('remove backups além da retenção e preserva os recentes', () => {
    const antigo = path.join(tmp, `backup-antigo${SUFIXO}`)
    const novo = path.join(tmp, `backup-novo${SUFIXO}`)
    const outro = path.join(tmp, 'nao-e-backup.txt')

    fs.writeFileSync(antigo, 'x')
    fs.writeFileSync(novo, 'x')
    fs.writeFileSync(outro, 'x')

    const trintaDiasAtras = Date.now() - 30 * 24 * 60 * 60 * 1000
    fs.utimesSync(antigo, trintaDiasAtras / 1000, trintaDiasAtras / 1000)

    const removidos = limparAntigos(tmp, 14)

    expect(removidos).toBe(1)
    expect(fs.existsSync(antigo)).toBe(false)
    expect(fs.existsSync(novo)).toBe(true)
    // Não mexe em arquivo que não é backup.
    expect(fs.existsSync(outro)).toBe(true)
  })

  it('retenção é configurável e tem padrão sensato', () => {
    const guardada = process.env.BACKUP_RETENCAO_DIAS

    try {
      delete process.env.BACKUP_RETENCAO_DIAS
      expect(retencaoDias()).toBe(14)

      process.env.BACKUP_RETENCAO_DIAS = '30'
      expect(retencaoDias()).toBe(30)

      // Valor inválido não deve virar zero, que apagaria tudo.
      process.env.BACKUP_RETENCAO_DIAS = 'abc'
      expect(retencaoDias()).toBe(14)

      process.env.BACKUP_RETENCAO_DIAS = '0'
      expect(retencaoDias()).toBe(14)
    } finally {
      if (guardada) process.env.BACKUP_RETENCAO_DIAS = guardada
      else delete process.env.BACKUP_RETENCAO_DIAS
    }
  })
})

describe('restauração', () => {
  it('restaura o backup e os dados voltam iguais', async () => {
    // Dado conhecido, para conferir depois da volta.
    await prisma.user.create({
      data: { nome: 'Antes do Backup', email: 'antes@teste.com', senha: 'hash-conhecido' },
    })
    const antes = await prisma.user.count()

    const r = await gerarBackup({ destino: tmp })

    // Simula perda: o banco restaurado vai para outro caminho.
    const destino = path.join(tmp, 'restaurado.db')
    decifrarBackup(r.arquivo, destino)

    const integridade = await verificarIntegridade(destino)

    expect(integridade.ok).toBe(true)
    expect(integridade.detalhe).toBe('ok')
    expect(integridade.tabelas).toBeGreaterThan(10)
    expect(integridade.usuarios).toBe(antes)

    // O registro específico voltou, com o conteúdo certo.
    const restaurado = new PrismaClient({ datasources: { db: { url: `file:${destino}` } } })
    try {
      const u = await restaurado.user.findUnique({ where: { email: 'antes@teste.com' } })
      expect(u?.nome).toBe('Antes do Backup')
      expect(u?.senha).toBe('hash-conhecido')
    } finally {
      await restaurado.$disconnect()
    }
  })

  it('recusa arquivo adulterado', async () => {
    const r = await gerarBackup({ destino: tmp })

    // Altera um byte no meio do conteúdo cifrado.
    const dados = fs.readFileSync(r.arquivo)
    dados[Math.floor(dados.length / 2)] ^= 0xff
    fs.writeFileSync(r.arquivo, dados)

    expect(() => decifrarBackup(r.arquivo, path.join(tmp, 'x.db'))).toThrow(/decifrar/)
  })

  it('recusa arquivo que não é um backup nosso', () => {
    const falso = path.join(tmp, 'qualquer.db.enc')
    fs.writeFileSync(falso, 'conteúdo aleatório que não é backup')

    expect(() => decifrarBackup(falso, path.join(tmp, 'y.db'))).toThrow(/cabeçalho/)
  })

  it('recusa restaurar com a chave errada', async () => {
    const r = await gerarBackup({ destino: tmp })
    const guardada = process.env.ENCRYPTION_KEY

    try {
      // Outra chave de 32 bytes.
      process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')

      expect(() => decifrarBackup(r.arquivo, path.join(tmp, 'z.db'))).toThrow(/ENCRYPTION_KEY/)
    } finally {
      process.env.ENCRYPTION_KEY = guardada
    }
  })
})
