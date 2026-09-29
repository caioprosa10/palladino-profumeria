import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/guard'
import { shippingService } from '@/services/MelhorEnvioService'

export async function GET() {
  const auth = await requireAdminApi()
  if (auth.response) return auth.response

  try {
    const isConnected = await shippingService.testConnection()
    return NextResponse.json({ connected: isConnected })
  } catch (error: any) {
    return NextResponse.json({ connected: false, error: error.message }, { status: 500 })
  }
}
