import { NextResponse } from 'next/server'
import { z } from 'zod'
import QRCode from 'qrcode'
import { requireAdminApi } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { cifrar, decifrar } from '@/lib/cripto'
import {
  gerarSegredo,
  montarUri,
  conferirCodigo,
  gerarCodigosBackup,
  cifrarCodigosBackup,
} from '@/lib/dois-fatores'
import { AuditService } from '@/services/audit.service'
import { lerCorpo, respostaDeCorpoInvalido, ipDaRequisicao } from '@/lib/validacao'
import { revogarSessoesDoUsuario } from '@/lib/sessao'

const acaoSchema = z.object({
  acao: z.enum(['iniciar', 'confirmar', 'desativar']),
  codigo: z.string().max(20).optional(),
})

/** Situação atual do 2FA da conta que está pedindo. */
export async function GET() {
  const auth = await requireAdminApi()
  if (auth.response) return auth.response

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { totpAtivo: true, totpBackup: true },
  })

  // Decifrar antes de contar: o valor guardado é base64 e não tem as
  // vírgulas que separam os códigos.
  const codigos = decifrar(user?.totpBackup)

  return NextResponse.json({
    ativo: user?.totpAtivo ?? false,
    codigosRestantes: codigos ? codigos.split(',').filter(Boolean).length : 0,
  })
}

export async function POST(req: Request) {
  const auth = await requireAdminApi()
  if (auth.response) return auth.response

  const ip = ipDaRequisicao(req)
  const adminId = auth.user.id

  try {
    const { acao, codigo } = await lerCorpo(req, acaoSchema)

    const user = await prisma.user.findUnique({
      where: { id: adminId },
      select: { email: true, totpSecret: true, totpAtivo: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    }

    // ---- Passo 1: gera o segredo, ainda sem ativar ----
    if (acao === 'iniciar') {
      if (user.totpAtivo) {
        return NextResponse.json(
          { error: 'O segundo fator já está ativo. Desative antes de configurar de novo.' },
          { status: 409 }
        )
      }

      const segredo = gerarSegredo()
      const codigosBackup = gerarCodigosBackup()

      // Só é gravado como pendente: totpAtivo continua false até o
      // usuário provar que consegue gerar um código válido. Sem isso,
      // um erro na configuração trancaria a própria conta.
      await prisma.user.update({
        where: { id: adminId },
        data: {
          totpSecret: cifrar(segredo),
          totpBackup: cifrarCodigosBackup(codigosBackup),
          totpAtivo: false,
        },
      })

      const uri = montarUri(user.email, segredo)

      return NextResponse.json({
        qr: await QRCode.toDataURL(uri, { margin: 1, width: 240 }),
        // Para quem prefere digitar em vez de escanear.
        segredo,
        // Mostrados uma única vez: depois só ficam cifrados no banco.
        codigosBackup,
      })
    }

    // ---- Passo 2: confirma e ativa ----
    if (acao === 'confirmar') {
      if (!codigo) {
        return NextResponse.json({ error: 'Informe o código do aplicativo.' }, { status: 400 })
      }

      if (!conferirCodigo(codigo, user.totpSecret)) {
        await AuditService.log({ acao: '2FA_CONFIRMACAO_FALHOU', ip, endpoint: '/api/admin/2fa', resultado: adminId })
        return NextResponse.json({ error: 'Código inválido. Tente o código atual do aplicativo.' }, { status: 400 })
      }

      await prisma.user.update({ where: { id: adminId }, data: { totpAtivo: true } })
      await AuditService.log({ acao: '2FA_ATIVADO', ip, endpoint: '/api/admin/2fa', resultado: adminId })

      return NextResponse.json({ ativo: true })
    }

    // ---- Desativar: exige um código válido ----
    if (!codigo) {
      return NextResponse.json({ error: 'Informe o código do aplicativo para desativar.' }, { status: 400 })
    }

    if (!conferirCodigo(codigo, user.totpSecret)) {
      await AuditService.log({ acao: '2FA_DESATIVACAO_FALHOU', ip, endpoint: '/api/admin/2fa', resultado: adminId })
      return NextResponse.json({ error: 'Código inválido.' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: adminId },
      data: { totpAtivo: false, totpSecret: null, totpBackup: null },
    })

    // Desativar o segundo fator baixa a proteção da conta: encerra as
    // outras sessões para que só quem fez isso continue dentro.
    await revogarSessoesDoUsuario(adminId)
    await AuditService.log({ acao: '2FA_DESATIVADO', ip, endpoint: '/api/admin/2fa', resultado: adminId })

    return NextResponse.json({ ativo: false })
  } catch (error) {
    const r = respostaDeCorpoInvalido(error)
    if (r) return r
    console.error('Erro no 2FA:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
