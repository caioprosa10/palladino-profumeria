/**
 * Cópia de segurança do banco SQLite, cifrada.
 *
 * Usa `VACUUM INTO`, nunca uma cópia bruta do arquivo: copiar enquanto a
 * aplicação escreve captura um estado parcial, sem o conteúdo do WAL, e o
 * resultado pode abrir sem erro e ainda assim estar corrompido. VACUUM
 * INTO pede ao próprio SQLite uma cópia consistente.
 *
 * O arquivo sai cifrado com ENCRYPTION_KEY, porque um dump do banco
 * contém hashes de senha, CPF e dados de pedidos.
 *
 * Uso:
 *   npx tsx scripts/backup.ts
 *   npx tsx scripts/backup.ts --destino /caminho
 */

import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const ALGORITMO = 'aes-256-gcm'
const TAMANHO_IV = 12
const CABECALHO = Buffer.from('PPBK1')

export const SUFIXO = '.db.enc'

function chave(): Buffer {
  const bruta = process.env.ENCRYPTION_KEY
  if (!bruta) {
    throw new Error('ENCRYPTION_KEY não definida: o backup seria gravado em claro.')
  }

  const b64 = Buffer.from(bruta, 'base64')
  return b64.length === 32 ? b64 : crypto.createHash('sha256').update(bruta, 'utf8').digest()
}

export function pastaDeBackup(): string {
  return process.env.BACKUP_DIR || path.resolve('/data/backups')
}

export function retencaoDias(): number {
  const n = Number(process.env.BACKUP_RETENCAO_DIAS)
  return Number.isFinite(n) && n > 0 ? n : 14
}

/** Cifra em streaming, para não carregar o banco inteiro na memória. */
async function cifrarArquivo(origem: string, destino: string): Promise<void> {
  const iv = crypto.randomBytes(TAMANHO_IV)
  const cipher = crypto.createCipheriv(ALGORITMO, chave(), iv)

  const entrada = fs.createReadStream(origem)
  const saida = fs.createWriteStream(destino)

  // Formato: CABECALHO | IV | conteúdo cifrado | tag de autenticação.
  saida.write(CABECALHO)
  saida.write(iv)

  await new Promise<void>((resolve, reject) => {
    entrada.on('error', reject)
    saida.on('error', reject)
    cipher.on('error', reject)

    cipher.on('end', () => {
      // A tag só existe depois de todo o conteúdo passar pelo cipher.
      saida.end(cipher.getAuthTag(), () => resolve())
    })

    entrada.pipe(cipher, { end: true })
    cipher.pipe(saida, { end: false })
  })
}

/** Apaga backups além da janela de retenção. */
export function limparAntigos(pasta: string, dias: number): number {
  if (!fs.existsSync(pasta)) return 0

  const limite = Date.now() - dias * 24 * 60 * 60 * 1000
  let removidos = 0

  for (const nome of fs.readdirSync(pasta)) {
    if (!nome.endsWith(SUFIXO)) continue

    const alvo = path.join(pasta, nome)
    if (fs.statSync(alvo).mtimeMs < limite) {
      fs.unlinkSync(alvo)
      removidos++
    }
  }

  return removidos
}

export interface ResultadoBackup {
  arquivo: string
  bytes: number
  removidos: number
}

export async function gerarBackup(opcoes: { destino?: string } = {}): Promise<ResultadoBackup> {
  const pasta = opcoes.destino || pastaDeBackup()
  fs.mkdirSync(pasta, { recursive: true })

  // Confere a chave ANTES de qualquer trabalho. Instanciar o PrismaClient
  // recarrega o .env via dotenv, o que repovoaria a variável e faria a
  // verificação passar por acidente em máquina de desenvolvimento.
  chave()

  const marca = new Date().toISOString().replace(/[:.]/g, '-')
  const arquivo = path.join(pasta, `backup-${marca}${SUFIXO}`)

  // A cópia consistente vai primeiro para um temporário, fora da pasta de
  // backups, para não ser confundida com um backup pronto se algo falhar.
  const temporario = path.join(os.tmpdir(), `palladino-${marca}.db`)

  const prisma = new PrismaClient()

  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO '${temporario.replace(/'/g, "''")}'`)
    await cifrarArquivo(temporario, arquivo)
  } finally {
    await prisma.$disconnect()
    if (fs.existsSync(temporario)) fs.unlinkSync(temporario)
  }

  return {
    arquivo,
    bytes: fs.statSync(arquivo).size,
    removidos: limparAntigos(pasta, retencaoDias()),
  }
}

async function main() {
  const i = process.argv.indexOf('--destino')
  const destino = i > -1 ? process.argv[i + 1] : undefined

  const r = await gerarBackup({ destino })

  console.log(`Backup:    ${r.arquivo}`)
  console.log(`Tamanho:   ${(r.bytes / 1024).toFixed(0)} KB`)
  console.log(`Retenção:  ${retencaoDias()} dias (${r.removidos} antigo(s) removido(s))`)
  console.log('\nO arquivo está cifrado. Restaure com scripts/restaurar.ts.')
  console.log('Guarde uma cópia fora do Render e teste a restauração.')
}

if (process.argv[1]?.includes('backup')) {
  main().catch((e) => {
    console.error(`\nFalha no backup: ${e.message}`)
    process.exit(1)
  })
}
