import { NextResponse } from 'next/server'
import { sessaoAtual } from '@/lib/sessao'

export async function GET() {
  // Confere a sessão no banco: um token de sessão revogada ou de conta
  // desativada não deve mais ser aceito aqui.
  const user = await sessaoAtual()

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  return NextResponse.json({ user })
}
