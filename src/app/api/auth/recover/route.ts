import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 })
    }

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
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
