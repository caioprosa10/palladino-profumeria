import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

// Helper to write file
const saveFile = async (file: File): Promise<string> => {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
  const extension = file.name.split('.').pop()
  const filename = `${uniqueSuffix}.${extension}`
  
  const uploadDir = path.join(process.cwd(), 'public/uploads')
  const filepath = path.join(uploadDir, filename)
  
  fs.writeFileSync(filepath, buffer)
  return `/uploads/${filename}`
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // 1. Auth Check
    const cookieStore = await cookies()
    const session = cookieStore.get('session')?.value
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const payload = await decrypt(session)
    if (!payload || (payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Parse FormData
    const formData = await req.formData()
    
    const nome = formData.get('nome') as string
    const descricao = formData.get('descricao') as string
    const descricao_curta = formData.get('descricao_curta') as string || null
    const preco = parseFloat(formData.get('preco') as string)
    const preco_promocional = formData.get('preco_promocional') ? parseFloat(formData.get('preco_promocional') as string) : null
    const estoque = parseInt(formData.get('estoque') as string) || 0
    const sku = formData.get('sku') as string
    const codigo_barras = formData.get('codigo_barras') as string || null
    const peso = formData.get('peso') ? parseFloat(formData.get('peso') as string) : null
    const dimensoes = formData.get('dimensoes') as string || null
    const fragrancia = formData.get('fragrancia') as string || null
    const ativo = formData.get('ativo') === 'true'
    const categoria_id = formData.get('categoria_id') as string

    if (!nome || !descricao || !preco || !sku || !categoria_id) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
    }

    const slug = nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

    // Handle Image Uploads
    const imageFiles = formData.getAll('imagens') as File[]
    const newImageUrls: string[] = []
    
    for (const file of imageFiles) {
      if (file.size > 0 && file.type.startsWith('image/')) {
        const url = await saveFile(file)
        newImageUrls.push(url)
      }
    }

    // Determine what to do with images:
    // If new images are uploaded, delete old relationships (but keep files for simplicity in this prototype)
    let imagesUpdateData = undefined
    if (newImageUrls.length > 0) {
      // First, find existing to clean up DB references
      await prisma.imagem.deleteMany({ where: { produto_id: id } })
      
      imagesUpdateData = {
        create: newImageUrls.map((url, index) => ({
          url,
          ordem: index
        }))
      }
    }

    // 3. Save to Database
    const updatedProduct = await prisma.produto.update({
      where: { id },
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
        ...(imagesUpdateData && { imagens: imagesUpdateData })
      }
    })

    return NextResponse.json({ success: true, produto: updatedProduct }, { status: 200 })
  } catch (error: any) {
    console.error('Update Product Error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'SKU ou nome já existe.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Auth Check
    const cookieStore = await cookies()
    const session = cookieStore.get('session')?.value
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const payload = await decrypt(session)
    if (!payload || (payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.produto.delete({
      where: { id }
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Delete Product Error:', error)
    return NextResponse.json({ error: 'Erro ao deletar produto' }, { status: 500 })
  }
}
