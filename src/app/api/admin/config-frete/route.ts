import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
    let config = await prisma.configuracaoFrete.findFirst()
    if (!config) {
      // Cria config padrão vazia se não existir
      config = await prisma.configuracaoFrete.create({
        data: {}
      })
    }

    // Máscara
    const mascara = (str?: string | null) => str ? `${str.substring(0, 10)}...${str.substring(str.length - 10)}` : ''

    return NextResponse.json({
      id: config.id,
      tokenMasked: mascara(config.token),
      clientId: config.clientId,
      clientSecretMasked: mascara(config.clientSecret),
      ambiente: config.ambiente,
      cepOrigem: config.cepOrigem
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const data = await request.json()
    let config = await prisma.configuracaoFrete.findFirst()
    
    if (!config) {
      config = await prisma.configuracaoFrete.create({ data: {} })
    }

    // Apenas atualiza campos que vieram não-vazios (para não sobreescrever os mascarados acidentalmente)
    const updateData: any = {
      ambiente: data.ambiente,
      cepOrigem: data.cepOrigem,
      clientId: data.clientId
    }
    
    if (data.token && !data.token.includes('...')) updateData.token = data.token
    if (data.clientSecret && !data.clientSecret.includes('...')) updateData.clientSecret = data.clientSecret

    const updated = await prisma.configuracaoFrete.update({
      where: { id: config.id },
      data: updateData
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 })
  }
}
