/**
 * Cifra os campos sensíveis que ainda estão em texto puro no banco.
 *
 * A cifragem foi introduzida depois de o banco já existir, e cripto.ts é
 * retrocompatível de propósito: `decifrar` devolve valores sem o prefixo
 * `enc:v1:` como estão. Isso evitou um flag day, mas deixa dados antigos
 * legíveis para quem obtiver o arquivo SQLite. Este script fecha essa
 * janela.
 *
 * Uso:
 *   npx tsx scripts/migrar-criptografia.ts --dry-run
 *   npx tsx scripts/migrar-criptografia.ts
 *
 * Nunca registra valores em log — apenas contagens. Ver docs/operacao.md.
 */

import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { cifrar, decifrar, estaCifrado } from '../src/lib/cripto'

const LOTE = 100

interface Campo {
  tabela: string
  coluna: string
  /** Lê os registros que ainda não estão cifrados. */
  carregar: (prisma: PrismaClient) => Promise<{ id: string; valor: string }[]>
  gravar: (prisma: PrismaClient, id: string, valor: string) => Promise<unknown>
  ler: (prisma: PrismaClient, id: string) => Promise<string | null>
}

const CAMPOS: Campo[] = [
  {
    tabela: 'User',
    coluna: 'cpf',
    carregar: async (p) =>
      (await p.user.findMany({ where: { cpf: { not: null } }, select: { id: true, cpf: true } }))
        .filter((r) => r.cpf && !estaCifrado(r.cpf))
        .map((r) => ({ id: r.id, valor: r.cpf! })),
    gravar: (p, id, valor) => p.user.update({ where: { id }, data: { cpf: valor } }),
    ler: async (p, id) => (await p.user.findUnique({ where: { id }, select: { cpf: true } }))?.cpf ?? null,
  },
  {
    tabela: 'User',
    coluna: 'totpSecret',
    carregar: async (p) =>
      (await p.user.findMany({ where: { totpSecret: { not: null } }, select: { id: true, totpSecret: true } }))
        .filter((r) => r.totpSecret && !estaCifrado(r.totpSecret))
        .map((r) => ({ id: r.id, valor: r.totpSecret! })),
    gravar: (p, id, valor) => p.user.update({ where: { id }, data: { totpSecret: valor } }),
    ler: async (p, id) => (await p.user.findUnique({ where: { id }, select: { totpSecret: true } }))?.totpSecret ?? null,
  },
  {
    tabela: 'User',
    coluna: 'totpBackup',
    carregar: async (p) =>
      (await p.user.findMany({ where: { totpBackup: { not: null } }, select: { id: true, totpBackup: true } }))
        .filter((r) => r.totpBackup && !estaCifrado(r.totpBackup))
        .map((r) => ({ id: r.id, valor: r.totpBackup! })),
    gravar: (p, id, valor) => p.user.update({ where: { id }, data: { totpBackup: valor } }),
    ler: async (p, id) => (await p.user.findUnique({ where: { id }, select: { totpBackup: true } }))?.totpBackup ?? null,
  },
  {
    tabela: 'ConfiguracaoFrete',
    coluna: 'token',
    carregar: async (p) =>
      (await p.configuracaoFrete.findMany({ where: { token: { not: null } }, select: { id: true, token: true } }))
        .filter((r) => r.token && !estaCifrado(r.token))
        .map((r) => ({ id: r.id, valor: r.token! })),
    gravar: (p, id, valor) => p.configuracaoFrete.update({ where: { id }, data: { token: valor } }),
    ler: async (p, id) => (await p.configuracaoFrete.findUnique({ where: { id }, select: { token: true } }))?.token ?? null,
  },
  {
    tabela: 'ConfiguracaoFrete',
    coluna: 'clientSecret',
    carregar: async (p) =>
      (await p.configuracaoFrete.findMany({ where: { clientSecret: { not: null } }, select: { id: true, clientSecret: true } }))
        .filter((r) => r.clientSecret && !estaCifrado(r.clientSecret))
        .map((r) => ({ id: r.id, valor: r.clientSecret! })),
    gravar: (p, id, valor) => p.configuracaoFrete.update({ where: { id }, data: { clientSecret: valor } }),
    ler: async (p, id) => (await p.configuracaoFrete.findUnique({ where: { id }, select: { clientSecret: true } }))?.clientSecret ?? null,
  },
  {
    tabela: 'TokenIntegracao',
    coluna: 'token',
    carregar: async (p) =>
      (await p.tokenIntegracao.findMany({ select: { id: true, token: true } }))
        .filter((r) => r.token && !estaCifrado(r.token))
        .map((r) => ({ id: r.id, valor: r.token })),
    gravar: (p, id, valor) => p.tokenIntegracao.update({ where: { id }, data: { token: valor } }),
    ler: async (p, id) => (await p.tokenIntegracao.findUnique({ where: { id }, select: { token: true } }))?.token ?? null,
  },
]

/** Caminho do arquivo SQLite a partir da DATABASE_URL. */
function caminhoDoBanco(): string | null {
  const url = process.env.DATABASE_URL ?? ''
  if (!url.startsWith('file:')) return null

  const bruto = url.slice('file:'.length)
  // Prisma resolve caminhos relativos a partir da pasta do schema.
  return path.isAbsolute(bruto) ? bruto : path.resolve(process.cwd(), 'prisma', bruto)
}

/**
 * Cópia consistente antes de alterar.
 *
 * VACUUM INTO em vez de copiar o arquivo: copiar enquanto a aplicação
 * escreve pode capturar um estado parcial, sem o WAL.
 */
export async function fazerBackup(prisma: PrismaClient): Promise<string | null> {
  const origem = caminhoDoBanco()
  if (!origem || !fs.existsSync(origem)) return null

  const pasta = path.join(path.dirname(origem), 'backups')
  fs.mkdirSync(pasta, { recursive: true })

  const destino = path.join(pasta, `antes-da-migracao-${new Date().toISOString().replace(/[:.]/g, '-')}.db`)

  // VACUUM INTO falha se o destino existir, então o nome carrega a data.
  await prisma.$executeRawUnsafe(`VACUUM INTO '${destino.replace(/'/g, "''")}'`)
  return destino
}

export interface Resultado {
  cifrados: number
  jaCifrados: number
  verificados: number
  falhas: { tabela: string; coluna: string; id: string }[]
}

export async function migrar(
  prisma: PrismaClient,
  opcoes: { dryRun?: boolean; silencioso?: boolean } = {}
): Promise<Resultado> {
  const log = (...args: unknown[]) => {
    if (!opcoes.silencioso) console.log(...args)
  }

  const resultado: Resultado = { cifrados: 0, jaCifrados: 0, verificados: 0, falhas: [] }

  for (const campo of CAMPOS) {
    const pendentes = await campo.carregar(prisma)
    const rotulo = `${campo.tabela}.${campo.coluna}`

    if (pendentes.length === 0) {
      log(`  ${rotulo}: nada em claro`)
      continue
    }

    if (opcoes.dryRun) {
      log(`  ${rotulo}: ${pendentes.length} registro(s) seriam cifrados`)
      resultado.cifrados += pendentes.length
      continue
    }

    for (let i = 0; i < pendentes.length; i += LOTE) {
      const lote = pendentes.slice(i, i + LOTE)

      // Transação por lote: uma falha no meio não deixa metade cifrada.
      await prisma.$transaction(
        lote.map(({ id, valor }) => campo.gravar(prisma, id, cifrar(valor)!) as any)
      )

      // Releitura: confirma que o que foi gravado decifra para o original.
      for (const { id, valor } of lote) {
        const gravado = await campo.ler(prisma, id)
        if (decifrar(gravado) === valor) {
          resultado.verificados++
        } else {
          resultado.falhas.push({ tabela: campo.tabela, coluna: campo.coluna, id })
        }
      }

      resultado.cifrados += lote.length
    }

    log(`  ${rotulo}: ${pendentes.length} cifrado(s)`)
  }

  return resultado
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const prisma = new PrismaClient()

  try {
    console.log(dryRun ? '\nSimulação (nenhuma alteração será gravada)\n' : '\nMigração de criptografia\n')

    if (!dryRun) {
      const backup = await fazerBackup(prisma)
      console.log(backup ? `Backup: ${backup}\n` : 'Backup ignorado (banco não é SQLite local)\n')
    }

    const r = await migrar(prisma, { dryRun })

    console.log('')
    if (dryRun) {
      console.log(`Total que seria cifrado: ${r.cifrados}`)
      console.log('\nRode sem --dry-run para aplicar.')
    } else {
      console.log(`Cifrados:    ${r.cifrados}`)
      console.log(`Verificados: ${r.verificados}`)
      if (r.falhas.length) {
        // Só ids, nunca valores.
        console.error(`\n❌ ${r.falhas.length} registro(s) não verificaram:`)
        for (const f of r.falhas) console.error(`   ${f.tabela}.${f.coluna} id=${f.id}`)
        process.exitCode = 1
      } else {
        console.log('\n✅ Todos os registros decifram para o valor original.')
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Só executa quando chamado direto, para os testes poderem importar.
if (process.argv[1] && process.argv[1].includes('migrar-criptografia')) {
  main()
}
