import { NextResponse } from 'next/server'
import { z } from 'zod'
import { SecurityService } from '@/services/security.service'
import { prisma } from '@/lib/prisma'
import { lerCorpo, respostaDeCorpoInvalido, ipDaRequisicao } from '@/lib/validacao'

const recoverSchema = z.object({
  email: z.string().email('E-mail inválido').max(254),
})

export async function POST(req: Request) {
  try {
    const ip = ipDaRequisicao(req)
    if (await SecurityService.checkRateLimit(ip, '/api/auth/recover', 5)) {
      return NextResponse.json(
        { error: 'Muitas requisições. Aguarde alguns minutos e tente novamente.' },
        { status: 429 }
      )
    }

    const { email } = await lerCorpo(req, recoverSchema)

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Retorna sucesso para evitar vazamento de dados de quais e-mails estão cadastrados
      return NextResponse.json({ message: 'Se o e-mail existir, você receberá as instruções em breve.' })
    }

    // Lógica para enviar e-mail com token de recuperação.
    console.log(`[Simulação] E-mail de recuperação enviado para: ${email}`)

    return NextResponse.json({ message: 'Se o e-mail existir, você receberá as instruções em breve.' })
  } catch (error) {
    const r = respostaDeCorpoInvalido(error)
    if (r) return r
    console.error('Erro na recuperação de senha:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
