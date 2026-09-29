import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
