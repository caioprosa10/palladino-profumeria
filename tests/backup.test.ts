import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { gerarBackup, limparAntigos, retencaoDias, SUFIXO } from '../scripts/backup'
import {
  decifrarBackup,
  restaurarDump,
  verificarIntegridade,
  ambienteDoPostgres,
} from '../scripts/restaurar'

const prisma = new PrismaClient()
const tmp = path.join(os.tmpdir(), 'palladino-teste-backup')

/**
 * Banco separado para o destino da restauração: `pg_restore --clean`
 * derruba e recria tudo, então restaurar sobre o banco de testes apagaria
 * os dados no meio da suíte.
 */
const urlTeste = process.env.DATABASE_URL!
const urlDestino = urlTeste.replace(/\/[^/?]+(\?|$)/, '/palladino_restore$1')

function nomeDoBanco(url: string) {
  return ambienteDoPostgres(url).PGDATABASE
}

function psql(sql: string, banco = 'postgres') {
  const env = { ...process.env, ...ambienteDoPostgres(urlTeste), PGDATABASE: banco }
  execSync(`psql -v ON_ERROR_STOP=1 -c ${JSON.stringify(sql)}`, { env, stdio: 'pipe' })
}

beforeAll(() => {
  execSync('npx prisma migrate deploy', { stdio: 'pipe' })

  // Banco de destino limpo para os testes de restauração.
  try {
    psql(`DROP DATABASE IF EXISTS ${nomeDoBanco(urlDestino)}`)
  } catch {
    // Pode não existir ainda.
  }
  psql(`CREATE DATABASE ${nomeDoBanco(urlDestino)}`)
})

beforeEach(async () => {
  fs.rmSync(tmp, { recursive: true, force: true })
  fs.mkdirSync(tmp, { recursive: true })
  await prisma.arquivo.deleteMany({})
  await prisma.user.deleteMany({})
})

afterAll(async () => {
  fs.rmSync(tmp, { recursive: true, force: true })
  await prisma.$disconnect()

  try {
    psql(`DROP DATABASE IF EXISTS ${nomeDoBanco(urlDestino)}`)
  } catch {
    // Melhor deixar o banco de sobra do que falhar a suíte na limpeza.
  }
})

describe('ambienteDoPostgres', () => {
  it('decompõe a URL sem deixar a senha em argumento', () => {
    const e = ambienteDoPostgres('postgresql://usuario:segredo@host.exemplo:5433/meubanco?sslmode=require')

    expect(e.PGHOST).toBe('host.exemplo')
    expect(e.PGPORT).toBe('5433')
    expect(e.PGUSER).toBe('usuario')
    expect(e.PGDATABASE).toBe('meubanco')
    expect(e.PGSSLMODE).toBe('require')
    // A senha vai por variável de ambiente, não na linha de comando.
    expect(e.PGPASSWORD).toBe('segredo')
  })

  it('assume a porta padrão e aceita URL sem senha', () => {
    const e = ambienteDoPostgres('postgresql://eu@localhost/banco')

    expect(e.PGPORT).toBe('5432')
    expect(e.PGPASSWORD).toBeUndefined()
  })

  it('decodifica caracteres escapados na senha', () => {
    const e = ambienteDoPostgres('postgresql://u:a%40b%3Ac@h/d')
    expect(e.PGPASSWORD).toBe('a@b:c')
  })
})

describe('backup', () => {
  it('gera um arquivo cifrado', async () => {
    const r = await gerarBackup({ destino: tmp })

    expect(fs.existsSync(r.arquivo)).toBe(true)
    expect(r.bytes).toBeGreaterThan(0)
    expect(r.arquivo.endsWith(SUFIXO)).toBe(true)

    // Não é um despejo em claro: o cabeçalho é nosso, não 'PGDMP'.
    const inicio = fs.readFileSync(r.arquivo).subarray(0, 16).toString('binary')
    expect(inicio).not.toContain('PGDMP')
    expect(inicio.startsWith('PPBK2')).toBe(true)
  }, 60000)

  it('recusa gerar backup sem ENCRYPTION_KEY, em vez de gravar em claro', async () => {
    const guardada = process.env.ENCRYPTION_KEY
    delete process.env.ENCRYPTION_KEY

    try {
      await expect(gerarBackup({ destino: tmp })).rejects.toThrow(/ENCRYPTION_KEY/)
    } finally {
      process.env.ENCRYPTION_KEY = guardada
    }
  })

  it('não deixa o despejo em claro na pasta de backups', async () => {
    await gerarBackup({ destino: tmp })

    const arquivos = fs.readdirSync(tmp)
    expect(arquivos.every((a) => a.endsWith(SUFIXO))).toBe(true)
  }, 60000)

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
    // Dados conhecidos, incluindo uma imagem, para conferir na volta.
    await prisma.user.create({
      data: { nome: 'Antes do Backup', email: 'antes@teste.com', senha: 'hash-conhecido' },
    })
    await prisma.arquivo.create({
      data: {
        nome: '1700000000-aabbccddeeff.png',
        tipo: 'image/png',
        tamanho: 4,
        conteudo: Buffer.from([1, 2, 3, 4]),
      },
    })

    const r = await gerarBackup({ destino: tmp })

    // Simula perda: restaura num banco separado.
    const dump = path.join(tmp, 'restaurado.dump')
    decifrarBackup(r.arquivo, dump)
    await restaurarDump(dump, urlDestino)

    const integridade = await verificarIntegridade(urlDestino)

    expect(integridade.ok).toBe(true)
    expect(integridade.tabelas).toBeGreaterThan(10)
    expect(integridade.usuarios).toBe(1)
    expect(integridade.arquivos).toBe(1)

    // O registro específico voltou, com o conteúdo certo.
    const restaurado = new PrismaClient({ datasources: { db: { url: urlDestino } } })
    try {
      const u = await restaurado.user.findUnique({ where: { email: 'antes@teste.com' } })
      expect(u?.nome).toBe('Antes do Backup')
      expect(u?.senha).toBe('hash-conhecido')

      // A imagem voltou byte a byte.
      const a = await restaurado.arquivo.findUnique({ where: { nome: '1700000000-aabbccddeeff.png' } })
      expect(Buffer.from(a!.conteudo)).toEqual(Buffer.from([1, 2, 3, 4]))
    } finally {
      await restaurado.$disconnect()
    }
  }, 120000)

  it('recusa arquivo adulterado', async () => {
    const r = await gerarBackup({ destino: tmp })

    // Altera um byte no meio do conteúdo cifrado.
    const dados = fs.readFileSync(r.arquivo)
    dados[Math.floor(dados.length / 2)] ^= 0xff
    fs.writeFileSync(r.arquivo, dados)

    expect(() => decifrarBackup(r.arquivo, path.join(tmp, 'x.dump'))).toThrow(/decifrar/)
  }, 60000)

  it('recusa arquivo que não é um backup nosso', () => {
    const falso = path.join(tmp, `qualquer${SUFIXO}`)
    fs.writeFileSync(falso, 'conteúdo aleatório que não é backup')

    expect(() => decifrarBackup(falso, path.join(tmp, 'y.dump'))).toThrow(/cabeçalho/)
  })

  it('recusa restaurar com a chave errada', async () => {
    const r = await gerarBackup({ destino: tmp })
    const guardada = process.env.ENCRYPTION_KEY

    try {
      // Outra chave de 32 bytes.
      process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')

      expect(() => decifrarBackup(r.arquivo, path.join(tmp, 'z.dump'))).toThrow(/ENCRYPTION_KEY/)
    } finally {
      process.env.ENCRYPTION_KEY = guardada
    }
  }, 60000)
})
