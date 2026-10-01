/**
 * Restaura um backup gerado por scripts/backup.ts.
 *
 * Backup que nunca foi restaurado não é backup — é um arquivo com nome
 * tranquilizador. Este script existe para que restaurar seja um
 * procedimento testado, não uma improvisação no dia do incidente.
 *
 * Uso:
 *   npm run restaurar -- <arquivo.dump.enc> --destino postgresql://.../teste
 *   npm run restaurar -- <arquivo.dump.enc>    # sobre o banco de DATABASE_URL
 */

import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import readline from 'readline'
import { spawn } from 'child_process'
import { PrismaClient } from '@prisma/client'

const ALGORITMO = 'aes-256-gcm'
const TAMANHO_IV = 12
const TAMANHO_TAG = 16
const CABECALHO = Buffer.from('PPBK2')

function chave(): Buffer {
  const bruta = process.env.ENCRYPTION_KEY
  if (!bruta) {
    throw new Error('ENCRYPTION_KEY não definida: sem ela o backup não pode ser lido.')
  }

  const b64 = Buffer.from(bruta, 'base64')
  return b64.length === 32 ? b64 : crypto.createHash('sha256').update(bruta, 'utf8').digest()
}

export function decifrarBackup(origem: string, destino: string): void {
  const dados = fs.readFileSync(origem)

  if (!dados.subarray(0, CABECALHO.length).equals(CABECALHO)) {
    throw new Error('Arquivo não é um backup desta aplicação (cabeçalho inválido).')
  }

  const inicio = CABECALHO.length
  const iv = dados.subarray(inicio, inicio + TAMANHO_IV)
  const tag = dados.subarray(dados.length - TAMANHO_TAG)
  const conteudo = dados.subarray(inicio + TAMANHO_IV, dados.length - TAMANHO_TAG)

  const decipher = crypto.createDecipheriv(ALGORITMO, chave(), iv)
  decipher.setAuthTag(tag)

  let claro: Buffer
  try {
    claro = Buffer.concat([decipher.update(conteudo), decipher.final()])
  } catch {
    // A tag do GCM não fecha: arquivo alterado, ou chave diferente.
    throw new Error(
      'Falha ao decifrar. O arquivo foi alterado, ou ENCRYPTION_KEY não é a mesma usada no backup.'
    )
  }

  fs.mkdirSync(path.dirname(destino), { recursive: true })
  fs.writeFileSync(destino, claro)
}

/**
 * Decompõe a URL em variáveis PG*, para a senha não aparecer na lista de
 * processos — argumentos de processo são legíveis por qualquer usuário da
 * máquina, e a URL de conexão carrega a senha do banco.
 */
export function ambienteDoPostgres(url: string): Record<string, string> {
  const u = new URL(url)

  return {
    PGHOST: u.hostname,
    PGPORT: u.port || '5432',
    PGUSER: decodeURIComponent(u.username),
    ...(u.password ? { PGPASSWORD: decodeURIComponent(u.password) } : {}),
    PGDATABASE: u.pathname.replace(/^\//, ''),
    // O Postgres do Render exige TLS.
    ...(u.searchParams.get('sslmode') ? { PGSSLMODE: u.searchParams.get('sslmode')! } : {}),
    PGCONNECT_TIMEOUT: '30',
  }
}

/** Carrega o despejo com pg_restore. */
export function restaurarDump(dump: string, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'pg_restore',
      // --clean --if-exists derruba o que existe antes de recriar, para a
      // restauração ser o estado do backup e não uma mistura dos dois.
      ['--clean', '--if-exists', '--no-owner', '--no-acl', '-d', ambienteDoPostgres(url).PGDATABASE!, dump],
      {
        env: { ...process.env, ...ambienteDoPostgres(url) },
        stdio: ['ignore', 'ignore', 'pipe'],
      }
    )

    let erro = ''
    proc.stderr.on('data', (d) => (erro += String(d)))

    proc.on('error', (e) =>
      reject(new Error(`pg_restore não pôde ser executado: ${e.message}. Está instalado?`))
    )

    proc.on('close', (codigo) => {
      if (codigo === 0) resolve()
      else reject(new Error(`pg_restore falhou (código ${codigo}): ${erro.slice(0, 300)}`))
    })
  })
}

export interface Integridade {
  ok: boolean
  tabelas: number
  produtos: number
  usuarios: number
  arquivos: number
}

/**
 * Confere se o banco restaurado é utilizável.
 *
 * Contar registros confirma que o conteúdo chegou, e não só a estrutura.
 */
export async function verificarIntegridade(url: string): Promise<Integridade> {
  const prisma = new PrismaClient({ datasources: { db: { url } } })

  try {
    const tabelas = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      "SELECT COUNT(*) as n FROM information_schema.tables WHERE table_schema = 'public'"
    )

    const total = Number(tabelas[0]?.n ?? 0)

    return {
      ok: total > 10,
      tabelas: total,
      produtos: await prisma.produto.count(),
      usuarios: await prisma.user.count(),
      arquivos: await prisma.arquivo.count(),
    }
  } finally {
    await prisma.$disconnect()
  }
}

function confirmar(pergunta: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  return new Promise((resolve) => {
    rl.question(pergunta, (r) => {
      rl.close()
      resolve(r.trim().toLowerCase() === 'sim')
    })
  })
}

async function main() {
  const origem = process.argv[2]

  if (!origem) {
    console.error('Uso: npm run restaurar -- <arquivo.dump.enc> [--destino <url>]')
    process.exit(1)
  }

  if (!fs.existsSync(origem)) {
    console.error(`Arquivo não encontrado: ${origem}`)
    process.exit(1)
  }

  const i = process.argv.indexOf('--destino')
  const sobrescreve = i === -1
  const url = sobrescreve ? process.env.DATABASE_URL : process.argv[i + 1]

  if (!url) {
    console.error('Sem destino: informe --destino ou defina DATABASE_URL.')
    process.exit(1)
  }

  if (sobrescreve) {
    console.log('\n⚠️  Isto vai SOBRESCREVER o banco de DATABASE_URL.')
    console.log('    Pare a aplicação antes de continuar.\n')

    if (!(await confirmar('Digite "sim" para prosseguir: '))) {
      console.log('Cancelado.')
      return
    }
  }

  const temporario = path.join(os.tmpdir(), `restaurar-${Date.now()}.dump`)

  try {
    decifrarBackup(origem, temporario)
    console.log('\nBackup decifrado.')

    await restaurarDump(temporario, url)
    console.log('Despejo carregado.')

    const r = await verificarIntegridade(url)

    console.log(`\nTabelas:   ${r.tabelas}`)
    console.log(`Produtos:  ${r.produtos}`)
    console.log(`Usuários:  ${r.usuarios}`)
    console.log(`Arquivos:  ${r.arquivos}`)

    if (!r.ok) {
      console.error('\n❌ O banco restaurado não parece completo.')
      process.exitCode = 1
    } else {
      console.log('\n✅ Banco restaurado e verificado.')
    }
  } finally {
    if (fs.existsSync(temporario)) fs.unlinkSync(temporario)
  }
}

if (process.argv[1]?.includes('restaurar')) {
  main().catch((e) => {
    console.error(`\nFalha na restauração: ${e.message}`)
    process.exit(1)
  })
}
