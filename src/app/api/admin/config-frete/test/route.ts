import { NextResponse } from 'next/server'
import { shippingService } from '@/services/MelhorEnvioService'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/auth'

async function isAdmin() {
  const cookieStore = await cookies()
  // O login grava o cookie 'session'; estas rotas liam 'auth_token',
  // que nunca existiu, e validavam com um segredo próprio embutido.
  const token = cookieStore.get('session')?.value
  if (!token) return false

  const payload = await decrypt(token)
  if (!payload) return false

  return payload.role === 'ADMIN' || payload.role === 'SUPERADMIN'
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const isConnected = await shippingService.testConnection()
    return NextResponse.json({ connected: isConnected })
  } catch (error: any) {
    return NextResponse.json({ connected: false, error: error.message }, { status: 500 })
  }
}
