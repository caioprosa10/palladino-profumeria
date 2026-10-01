/**
 * Cópia de segurança do banco Postgres, cifrada.
 *
 * Usa `pg_dump` no formato custom (`-Fc`), que produz um despejo
 * consistente de um único ponto no tempo — copiar arquivos do diretório de
 * dados com o servidor em execução capturaria um estado parcial.
 *
 * O arquivo sai cifrado com ENCRYPTION_KEY, porque o despejo contém hashes
 * de senha, CPF, dados de pedidos e as imagens enviadas pelo painel.
 *
 * Uso:
 *   npm run backup
 *   npm run backup -- --destino /caminho
 */

import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { ambienteDoPostgres } from './restaurar'

const ALGORITMO = 'aes-256-gcm'
const TAMANHO_IV = 12
const CABECALHO = Buffer.from('PPBK2')

export const SUFIXO = '.dump.enc'

function chave(): Buffer {
  const bruta = process.env.ENCRYPTION_KEY
  if (!bruta) {
    throw new Error('ENCRYPTION_KEY não definida: o backup seria gravado em claro.')
  }

  const b64 = Buffer.from(bruta, 'base64')
  return b64.length === 32 ? b64 : crypto.createHash('sha256').update(bruta, 'utf8').digest()
}

export function pastaDeBackup(): string {
  return process.env.BACKUP_DIR || path.resolve('backups')
}

export function retencaoDias(): number {
  const n = Number(process.env.BACKUP_RETENCAO_DIAS)
  return Number.isFinite(n) && n > 0 ? n : 14
}

function urlDoBanco(): string {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL não definida.')
  if (!url.startsWith('postgres')) {
    throw new Error('DATABASE_URL não aponta para um Postgres.')
  }
  return url
}

/**
 * Despejo consistente com pg_dump.
 *
 * A URL vai por variável de ambiente, não em argumento: argumentos de
 * processo são visíveis para qualquer um que liste processos, e a URL
 * contém a senha do banco.
 */
function despejar(destino: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('pg_dump', ['-Fc', '--no-owner', '--no-acl', '-f', destino], {
      env: { ...process.env, ...ambienteDoPostgres(urlDoBanco()) },
      stdio: ['ignore', 'ignore', 'pipe'],
    })

    let erro = ''
    proc.stderr.on('data', (d) => (erro += String(d)))

    proc.on('error', (e) =>
      reject(new Error(`pg_dump não pôde ser executado: ${e.message}. Está instalado?`))
    )

    proc.on('close', (codigo) => {
      if (codigo === 0) resolve()
      // A mensagem do pg_dump pode repetir a URL; corta antes de propagar.
      else reject(new Error(`pg_dump falhou (código ${codigo}): ${erro.slice(0, 300)}`))
    })
  })
}

/** Cifra em streaming, para não carregar o despejo inteiro na memória. */
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
  // Confere chave e URL antes de qualquer trabalho.
  chave()
  urlDoBanco()

  const pasta = opcoes.destino || pastaDeBackup()
  fs.mkdirSync(pasta, { recursive: true })

  const marca = new Date().toISOString().replace(/[:.]/g, '-')
  const arquivo = path.join(pasta, `backup-${marca}${SUFIXO}`)

  // O despejo em claro vai para um temporário fora da pasta de backups,
  // para não ser confundido com um backup pronto se algo falhar.
  const temporario = path.join(os.tmpdir(), `palladino-${marca}.dump`)

  try {
    await despejar(temporario)
    await cifrarArquivo(temporario, arquivo)
  } finally {
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
  console.log('\nO arquivo está cifrado. Restaure com `npm run restaurar`.')
  console.log('Guarde uma cópia fora do Render e teste a restauração.')
}

if (process.argv[1]?.includes('backup')) {
  main().catch((e) => {
    console.error(`\nFalha no backup: ${e.message}`)
    process.exit(1)
  })
}
