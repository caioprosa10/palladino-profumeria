/**
 * Restaura um backup gerado por scripts/backup.ts.
 *
 * Backup que nunca foi restaurado não é backup — é um arquivo com nome
 * tranquilizador. Este script existe para que restaurar seja um
 * procedimento testado, não uma improvisação no dia do incidente.
 *
 * Uso:
 *   npx tsx scripts/restaurar.ts <arquivo.db.enc> --destino /tmp/teste.db
 *   npx tsx scripts/restaurar.ts <arquivo.db.enc>    # sobre o banco atual
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { PrismaClient } from '@prisma/client'

const ALGORITMO = 'aes-256-gcm'
const TAMANHO_IV = 12
const TAMANHO_TAG = 16
const CABECALHO = Buffer.from('PPBK1')

function chave(): Buffer {
  const bruta = process.env.ENCRYPTION_KEY
  if (!bruta) {
    throw new Error('ENCRYPTION_KEY não definida: sem ela o backup não pode ser lido.')
  }

  const b64 = Buffer.from(bruta, 'base64')
  return b64.length === 32 ? b64 : crypto.createHash('sha256').update(bruta, 'utf8').digest()
}

/** Caminho do banco em uso, a partir da DATABASE_URL. */
export function caminhoDoBanco(): string {
  const url = process.env.DATABASE_URL ?? ''
  if (!url.startsWith('file:')) {
    throw new Error('DATABASE_URL não aponta para um arquivo SQLite.')
  }

  const bruto = url.slice('file:'.length)
  return path.isAbsolute(bruto) ? bruto : path.resolve(process.cwd(), 'prisma', bruto)
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

export interface Integridade {
  ok: boolean
  detalhe: string
  tabelas: number
  produtos: number
  usuarios: number
}

/**
 * Confere se o arquivo restaurado é um banco utilizável.
 *
 * `PRAGMA integrity_check` detecta corrupção estrutural; contar registros
 * confirma que o conteúdo chegou, e não só a estrutura.
 */
export async function verificarIntegridade(arquivo: string): Promise<Integridade> {
  const prisma = new PrismaClient({ datasources: { db: { url: `file:${arquivo}` } } })

  try {
    const check = await prisma.$queryRawUnsafe<{ integrity_check: string }[]>(
      'PRAGMA integrity_check'
    )
    const detalhe = check[0]?.integrity_check ?? 'sem resposta'

    const tabelas = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      "SELECT COUNT(*) as n FROM sqlite_master WHERE type = 'table'"
    )

    return {
      ok: detalhe === 'ok',
      detalhe,
      tabelas: Number(tabelas[0]?.n ?? 0),
      produtos: await prisma.produto.count(),
      usuarios: await prisma.user.count(),
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
    console.error('Uso: npx tsx scripts/restaurar.ts <arquivo.db.enc> [--destino /caminho.db]')
    process.exit(1)
  }

  if (!fs.existsSync(origem)) {
    console.error(`Arquivo não encontrado: ${origem}`)
    process.exit(1)
  }

  const i = process.argv.indexOf('--destino')
  const sobrescreve = i === -1
  const destino = sobrescreve ? caminhoDoBanco() : process.argv[i + 1]

  if (sobrescreve) {
    console.log(`\n⚠️  Isto vai SOBRESCREVER o banco em uso:\n    ${destino}`)
    console.log('    Pare a aplicação antes de continuar, ou a restauração pode corromper o arquivo.\n')

    if (!(await confirmar('Digite "sim" para prosseguir: '))) {
      console.log('Cancelado.')
      return
    }
  }

  decifrarBackup(origem, destino)
  console.log(`\nRestaurado em: ${destino}`)

  const r = await verificarIntegridade(destino)

  console.log(`Integridade:  ${r.detalhe}`)
  console.log(`Tabelas:      ${r.tabelas}`)
  console.log(`Produtos:     ${r.produtos}`)
  console.log(`Usuários:     ${r.usuarios}`)

  if (!r.ok) {
    console.error('\n❌ O banco restaurado não passou na verificação de integridade.')
    process.exitCode = 1
  } else {
    console.log('\n✅ Banco restaurado e íntegro.')
  }
}

if (process.argv[1]?.includes('restaurar')) {
  main().catch((e) => {
    console.error(`\nFalha na restauração: ${e.message}`)
    process.exit(1)
  })
}
