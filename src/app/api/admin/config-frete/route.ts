import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { cifrar, decifrar } from '@/lib/cripto'

export async function GET() {
  const auth = await requireAdminApi()
  if (auth.response) return auth.response

  try {
    // Somente leitura: um GET não deve gravar no banco. Quando ainda não
    // há configuração, devolvemos os valores padrão; o registro é criado
    // no PUT, quando o administrador salva de fato.
    const config = await prisma.configuracaoFrete.findFirst()

    // Máscara
    // Decifra só para montar a máscara; o valor em claro nunca sai daqui.
    const mascara = (str?: string | null) => {
      const claro = decifrar(str)
      return claro ? `${claro.substring(0, 6)}...${claro.substring(claro.length - 4)}` : ''
    }

    return NextResponse.json({
      id: config?.id ?? null,
      tokenMasked: mascara(config?.token),
      clientId: config?.clientId ?? null,
      clientSecretMasked: mascara(config?.clientSecret),
      ambiente: config?.ambiente ?? 'production',
      cepOrigem: config?.cepOrigem ?? ''
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdminApi()
  if (auth.response) return auth.response

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
    
    // Credenciais vão cifradas para o banco: o arquivo SQLite não deve
    // conter o token do Melhor Envio em claro.
    if (data.token && !data.token.includes('...')) updateData.token = cifrar(data.token)
    if (data.clientSecret && !data.clientSecret.includes('...')) updateData.clientSecret = cifrar(data.clientSecret)

    const updated = await prisma.configuracaoFrete.update({
      where: { id: config.id },
      data: updateData
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 })
  }
}
