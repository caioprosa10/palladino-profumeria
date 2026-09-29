import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revogarSessao } from '@/lib/sessao'

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  // Apagar o cookie não bastava: o JWT seguia válido até expirar, então
  // uma cópia do token continuava dando acesso depois do logout.
  if (token) {
    await revogarSessao(token)
  }

  cookieStore.delete('session')
  return NextResponse.json({ message: 'Logout realizado com sucesso' })
}
