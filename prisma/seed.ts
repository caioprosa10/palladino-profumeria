import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@dubaielixir.com'
  const adminPassword = process.env.ADMIN_PASSWORD || '123456'
  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: 'SUPERADMIN',
      senha: hashedPassword
    },
    create: {
      nome: 'Super Admin',
      email: adminEmail,
      senha: hashedPassword,
      role: 'SUPERADMIN'
    }
  })

  const catMasculino = await prisma.categoria.upsert({
    where: { slug: 'masculino' },
    update: {},
    create: { nome: 'Masculino', slug: 'masculino' },
  })
  const catFeminino = await prisma.categoria.upsert({
    where: { slug: 'feminino' },
    update: {},
    create: { nome: 'Feminino', slug: 'feminino' },
  })
  const catMiniaturas = await prisma.categoria.upsert({
    where: { slug: 'miniaturas' },
    update: {},
    create: { nome: 'Miniaturas', slug: 'miniaturas' },
  })
  const catAtacado = await prisma.categoria.upsert({
    where: { slug: 'atacado' },
    update: {},
    create: { nome: 'Atacado', slug: 'atacado' },
  })
  
  await prisma.categoria.upsert({
    where: { slug: 'perfumes' },
    update: {},
    create: { nome: 'Perfumes', slug: 'perfumes' },
  })
  await prisma.categoria.upsert({
    where: { slug: 'cremes' },
    update: {},
    create: { nome: 'Cremes', slug: 'cremes' },
  })
  await prisma.categoria.upsert({
    where: { slug: 'body-splash' },
    update: {},
    create: { nome: 'Body Splash', slug: 'body-splash' },
  })
  await prisma.categoria.upsert({
    where: { slug: 'nicho' },
    update: {},
    create: { nome: 'Nicho', slug: 'nicho' },
  })

  // Produtos Masculinos
  await prisma.produto.upsert({
    where: { sku: 'aura-noire-01' },
    update: {},
    create: {
      nome: 'Aura Noire',
      slug: 'aura-noire',
      sku: 'aura-noire-01',
      descricao: 'Uma fragrância misteriosa e intensa com acordes de couro, tabaco e basalto.',
      descricao_curta: 'Eau de Parfum Intense - 50ml',
      preco: 890,
      estoque: 100,
      volume_ml: 50,
      concentracao: 'Eau de Parfum',
      categoria_id: catMasculino.id,
      imagens: { create: [{ url: '/imagem perfume/perfume-men-1.jpg' }] }
    }
  })

  await prisma.produto.upsert({
    where: { sku: 'aura-boisee-01' },
    update: {},
    create: {
      nome: 'Aura Boisée',
      slug: 'aura-boisee',
      sku: 'aura-boisee-01',
      descricao: 'O frescor cítrico fundido à nobreza do cedro e vetiver selvagem.',
      descricao_curta: 'Cítrico Amadeirado - 50ml',
      preco: 790,
      estoque: 100,
      volume_ml: 50,
      concentracao: 'Eau de Toilette',
      categoria_id: catMasculino.id,
      imagens: { create: [{ url: '/imagem perfume/perfume-men-1.jpg' }] } // No HTML estava usando o mesmo com filter
    }
  })

  await prisma.produto.upsert({
    where: { sku: 'aura-cuir-01' },
    update: {},
    create: {
      nome: 'Aura Cuir',
      slug: 'aura-cuir',
      sku: 'aura-cuir-01',
      descricao: 'A expressão máxima de sofisticação com notas de âmbar negro e couro nobre.',
      descricao_curta: 'Couro Intenso - 50ml',
      preco: 950,
      estoque: 100,
      volume_ml: 50,
      concentracao: 'Parfum',
      categoria_id: catMasculino.id,
      imagens: { create: [{ url: '/imagem perfume/perfume-men-1.jpg' }] }
    }
  })

  // Produtos Femininos
  await prisma.produto.upsert({
    where: { sku: 'aura-rose-01' },
    update: {},
    create: {
      nome: 'Aura Rosé',
      slug: 'aura-rose',
      sku: 'aura-rose-01',
      descricao: 'Fragrância delicada e envolvente com notas de rosas de grasse e peônia.',
      descricao_curta: 'Eau de Parfum - 50ml',
      preco: 850,
      estoque: 100,
      volume_ml: 50,
      concentracao: 'Eau de Parfum',
      categoria_id: catFeminino.id,
      imagens: { create: [{ url: '/imagem perfume/perfume-women-1.jpg' }] }
    }
  })

  await prisma.produto.upsert({
    where: { sku: 'aura-blanc-01' },
    update: {},
    create: {
      nome: 'Aura Blanc',
      slug: 'aura-blanc',
      sku: 'aura-blanc-01',
      descricao: 'Pureza e luminosidade em um bouquet de flores brancas.',
      descricao_curta: 'Floral Branco - 50ml',
      preco: 810,
      estoque: 100,
      volume_ml: 50,
      concentracao: 'Eau de Toilette',
      categoria_id: catFeminino.id,
      imagens: { create: [{ url: '/imagem perfume/perfume-women-1.jpg' }] }
    }
  })

  await prisma.produto.upsert({
    where: { sku: 'aura-eclat-01' },
    update: {},
    create: {
      nome: 'Aura Éclat',
      slug: 'aura-eclat',
      sku: 'aura-eclat-01',
      descricao: 'Vibrante e audaciosa, combinando frutas exóticas e madeiras nobres.',
      descricao_curta: 'Frutal Oriental - 50ml',
      preco: 920,
      estoque: 100,
      volume_ml: 50,
      concentracao: 'Parfum',
      categoria_id: catFeminino.id,
      imagens: { create: [{ url: '/imagem perfume/perfume-women-1.jpg' }] }
    }
  })

  // Produto Atacado
  await prisma.produto.upsert({
    where: { sku: 'aura-atacado-cx' },
    update: {},
    create: {
      nome: 'Caixa Aura Atacado',
      slug: 'caixa-aura-atacado',
      sku: 'aura-atacado-cx',
      descricao: 'Kit especial para revenda.',
      descricao_curta: 'Atacado Exclusivo - 50ml',
      preco: 450,
      estoque: 50,
      volume_ml: 50,
      atacado: true,
      categoria_id: catAtacado.id,
      imagens: { create: [{ url: '/imagem perfume/perfume-men-1.jpg' }] }
    }
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
