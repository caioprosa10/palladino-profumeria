import { NextResponse } from 'next/server'
import { shippingService } from '@/services/MelhorEnvioService'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

async function isAdmin() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return false
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || '***REMOVIDO***')
    const { payload } = await jwtVerify(token, secret)
    
    return payload.role === 'ADMIN' || payload.role === 'SUPERADMIN'
  } catch (error) {
    return false
  }
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
