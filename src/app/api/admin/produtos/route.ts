import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { saveImage, UploadInvalidoError } from '@/lib/upload'

export async function POST(req: Request) {
  try {
    // 1. Auth & RBAC Check
    const auth = await requireAdminApi()
    if (auth.response) return auth.response

    // 2. Parse FormData
    const formData = await req.formData()
    
    const nome = formData.get('nome') as string
    const descricao = formData.get('descricao') as string
    const descricao_curta = formData.get('descricao_curta') as string || null
    const preco = parseFloat(formData.get('preco') as string)
    const preco_promocional = formData.get('preco_promocional') ? parseFloat(formData.get('preco_promocional') as string) : null
    const estoque = parseInt(formData.get('estoque') as string) || 0
    const codigo_barras = formData.get('codigo_barras') as string || null
    const peso = formData.get('peso') ? parseFloat(formData.get('peso') as string) : null
    const dimensoes = formData.get('dimensoes') as string || null
    const fragrancia = formData.get('fragrancia') as string || null
    const ativo = formData.get('ativo') === 'true'
    const categoria_id = formData.get('categoria_id') as string

    if (!nome || !descricao || !preco || !categoria_id) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
    }

    // Generate Slug
    const slug = nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

    // Autogenerate SKU
    const seq = await prisma.skuSequence.update({
      where: { id: 1 },
      data: { valor: { increment: 1 } }
    });
    const sku = `DX-${seq.valor.toString().padStart(6, '0')}`;

    // Handle Image Uploads
    const imageFiles = formData.getAll('imagens') as File[]
    const imageUrls: string[] = []
    
    for (const file of imageFiles) {
      if (file.size > 0) {
        const url = await saveImage(file)
        imageUrls.push(url)
      }
    }

    // 3. Save to Database
    const newProduct = await prisma.produto.create({
      data: {
        nome,
        slug,
        sku,
        descricao,
        descricao_curta,
        preco,
        preco_promocional,
        estoque,
        codigo_barras,
        peso,
        dimensoes,
        fragrancia,
        ativo,
        categoria_id,
        imagens: {
          create: imageUrls.map((url, index) => ({
            url,
            ordem: index
          }))
        }
      }
    })

    return NextResponse.json({ success: true, produto: newProduct }, { status: 201 })
  } catch (error: any) {
    if (error instanceof UploadInvalidoError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Create Product Error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Nome ou SKU já existe.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
