/**
 * Redefine a senha de um administrador pelo terminal.
 *
 * Existe para não haver desculpa para senha de teste em produção, e para
 * dar saída quando ninguém consegue entrar no painel.
 *
 * A senha é lida sem eco — digitá-la visível a deixaria no histórico do
 * terminal e na tela de quem estiver olhando — e passa pela mesma
 * validação de força do cadastro público. Ao trocar, todas as sessões da
 * conta são revogadas.
 *
 * Uso:
 *   npx tsx scripts/redefinir-senha-admin.ts
 *   npx tsx scripts/redefinir-senha-admin.ts --email admin@exemplo.com
 */

import readline from 'readline'
import { PrismaClient } from '@prisma/client'
import { hashSenha, senhaSchema } from '../src/lib/password'

/** Leitura com eco desligado, para a senha não aparecer na tela. */
function perguntarOculto(pergunta: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const entrada = process.stdin

    if (!entrada.isTTY) {
      reject(new Error('A senha precisa ser digitada num terminal interativo.'))
      return
    }

    process.stdout.write(pergunta)

    const eraRaw = entrada.isRaw
    entrada.setRawMode(true)
    entrada.resume()

    let valor = ''

    const finalizar = () => {
      entrada.setRawMode(eraRaw ?? false)
      entrada.pause()
      entrada.removeListener('data', aoDigitar)
      process.stdout.write('\n')
    }

    const aoDigitar = (pedaco: Buffer) => {
      const texto = pedaco.toString('utf8')

      for (const ch of texto) {
        if (ch === '\r' || ch === '\n') {
          finalizar()
          resolve(valor)
          return
        }

        // Ctrl+C
        if (ch === '') {
          finalizar()
          reject(new Error('Cancelado.'))
          return
        }

        // Backspace ou delete
        if (ch === '' || ch === '\b') {
          valor = valor.slice(0, -1)
          continue
        }

        // Ignora caracteres de controle, mantendo acentos e símbolos.
        if (ch >= ' ') valor += ch
      }
    }

    entrada.on('data', aoDigitar)
  })
}

function perguntar(pergunta: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  return new Promise((resolve) => {
    rl.question(pergunta, (r) => {
      rl.close()
      resolve(r.trim())
    })
  })
}

async function main() {
  const prisma = new PrismaClient()

  try {
    const i = process.argv.indexOf('--email')
    let email = i > -1 ? process.argv[i + 1] : undefined

    if (!email) {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
        select: { email: true, role: true, ativo: true },
        orderBy: { createdAt: 'asc' },
      })

      if (admins.length === 0) {
        console.error('Nenhum administrador cadastrado. Rode `npm run db:seed` primeiro.')
        process.exit(1)
      }

      console.log('\nAdministradores:')
      admins.forEach((a, n) => {
        console.log(`  ${n + 1}. ${a.email}  (${a.role}${a.ativo ? '' : ', desativado'})`)
      })

      const escolha = await perguntar('\nNúmero ou e-mail: ')
      const porNumero = admins[Number(escolha) - 1]
      email = porNumero ? porNumero.email : escolha
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      console.error(`\nConta não encontrada: ${email}`)
      process.exit(1)
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      console.error(`\n${email} não é administrador.`)
      process.exit(1)
    }

    console.log(`\nRedefinindo a senha de ${user.email}.`)
    console.log('Mínimo de 10 caracteres, com letras e números. Nada aparece na tela.\n')

    const senha = await perguntarOculto('Nova senha: ')

    const valida = senhaSchema.safeParse(senha)
    if (!valida.success) {
      console.error(`\n${valida.error.issues[0].message}`)
      process.exit(1)
    }

    const confirmacao = await perguntarOculto('Repita a senha: ')

    if (senha !== confirmacao) {
      console.error('\nAs senhas não conferem.')
      process.exit(1)
    }

    const hash = await hashSenha(senha)

    const [, sessoes] = await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { senha: hash } }),
      // Trocar a senha derruba o que estiver aberto: se o motivo da troca
      // foi comprometimento, quem estava dentro é posto para fora.
      prisma.sessao.updateMany({
        where: { usuario_id: user.id, revogadaEm: null },
        data: { revogadaEm: new Date() },
      }),
    ])

    console.log(`\n✅ Senha alterada. ${sessoes.count} sessão(ões) revogada(s).`)
  } finally {
    await prisma.$disconnect()
  }
}

if (process.argv[1]?.includes('redefinir-senha-admin')) {
  main().catch((e) => {
    console.error(`\n${e.message}`)
    process.exit(1)
  })
}
