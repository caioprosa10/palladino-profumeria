import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CATEGORIES = [
  { nome: 'Perfumes', slug: 'perfumes' },
  { nome: 'Body Splash', slug: 'body-splash' },
  { nome: 'Cremes Hidratantes', slug: 'cremes' },
  { nome: 'Kits Presente', slug: 'kits' }
]

const DEMO_PRODUCTS = [
  // --- PERFUMES MASCULINOS ---
  { nome: '[Demonstração] Elixir Black', sku: 'DEMO-P-M-1', catSlug: 'perfumes', preco: 490, descricao: 'Trabalho, Dia a dia', descricao_curta: 'Elegante e profissional', genero: 'Masculino', fragrancia: 'Amadeirado', notas_olfativas: 'Sândalo, Cedro, Bergamota', estoque: 10, concentracao: 'Eau de Parfum', miniatura: false },
  { nome: '[Demonstração] Ocean Deep', sku: 'DEMO-P-M-2', catSlug: 'perfumes', preco: 350, descricao: 'Dia, Verão, Academia', descricao_curta: 'Fresco e revigorante', genero: 'Masculino', fragrancia: 'Aquático', notas_olfativas: 'Notas marinhas, Limão Siciliano', estoque: 15, concentracao: 'Eau de Toilette', miniatura: false },
  { nome: '[Demonstração] Desert Night', sku: 'DEMO-P-M-3', catSlug: 'perfumes', preco: 620, descricao: 'Noite, Festa, Intenso', descricao_curta: 'Marcante para noites', genero: 'Masculino', fragrancia: 'Oriental', notas_olfativas: 'Âmbar, Especiarias quentes, Couro', estoque: 5, concentracao: 'Parfum', miniatura: false },
  { nome: '[Demonstração] Vetiver Classic', sku: 'DEMO-P-M-4', catSlug: 'perfumes', preco: 410, descricao: 'Trabalho, Dia a dia', descricao_curta: 'Clássico verde', genero: 'Masculino', fragrancia: 'Aromático', notas_olfativas: 'Vetiver, Musgo de Carvalho, Lavanda', estoque: 12, concentracao: 'Eau de Parfum', miniatura: false },

  // --- PERFUMES FEMININOS ---
  { nome: '[Demonstração] Rose Velvet', sku: 'DEMO-P-F-1', catSlug: 'perfumes', preco: 510, descricao: 'Dia a dia, Encontro', descricao_curta: 'Floral romântico', genero: 'Feminino', fragrancia: 'Floral', notas_olfativas: 'Rosa Damascena, Peônia, Jasmim', estoque: 20, concentracao: 'Eau de Parfum', miniatura: false },
  { nome: '[Demonstração] Vanilla Gold', sku: 'DEMO-P-F-2', catSlug: 'perfumes', preco: 580, descricao: 'Noite, Festa, Intenso', descricao_curta: 'Doce e sedutor', genero: 'Feminino', fragrancia: 'Gourmand', notas_olfativas: 'Baunilha de Madagascar, Caramelo, Pralinê', estoque: 8, concentracao: 'Parfum', miniatura: false },
  { nome: '[Demonstração] Citrus Glow', sku: 'DEMO-P-F-3', catSlug: 'perfumes', preco: 390, descricao: 'Dia, Verão, Trabalho', descricao_curta: 'Energizante e fresco', genero: 'Feminino', fragrancia: 'Cítrico', notas_olfativas: 'Tangerina, Bergamota, Flor de Laranjeira', estoque: 14, concentracao: 'Eau de Toilette', miniatura: false },
  { nome: '[Demonstração] Amber Mystique', sku: 'DEMO-P-F-4', catSlug: 'perfumes', preco: 650, descricao: 'Casamento, Festa, Intenso', descricao_curta: 'Misterioso e luxuoso', genero: 'Feminino', fragrancia: 'Oriental Amadeirado', notas_olfativas: 'Âmbar, Oud, Patchouli', estoque: 3, concentracao: 'Parfum', miniatura: false },

  // --- PERFUMES UNISSEX ---
  { nome: '[Demonstração] Oud Supreme', sku: 'DEMO-P-U-1', catSlug: 'perfumes', preco: 890, descricao: 'Noite, Eventos, Intenso', descricao_curta: 'Oud premium compartilhavel', genero: 'Unissex', fragrancia: 'Amadeirado', notas_olfativas: 'Oud, Açafrão, Sândalo', estoque: 5, concentracao: 'Extrait de Parfum', miniatura: false },
  { nome: '[Demonstração] Bergamot Fresh', sku: 'DEMO-P-U-2', catSlug: 'perfumes', preco: 320, descricao: 'Uso versátil, Dia a dia', descricao_curta: 'Cítrico universal', genero: 'Unissex', fragrancia: 'Cítrico', notas_olfativas: 'Bergamota, Chá Verde, Almíscar', estoque: 25, concentracao: 'Eau de Toilette', miniatura: false },

  // --- BODY SPLASH ---
  { nome: '[Demonstração] Splash Berry', sku: 'DEMO-B-F-1', catSlug: 'body-splash', preco: 95, descricao: 'Dia a dia, Pós-banho', descricao_curta: 'Refrescância frutada', genero: 'Feminino', fragrancia: 'Frutado', notas_olfativas: 'Morango, Framboesa, Baunilha', estoque: 30, concentracao: 'Body Splash', miniatura: false },
  { nome: '[Demonstração] Splash Ocean', sku: 'DEMO-B-M-1', catSlug: 'body-splash', preco: 95, descricao: 'Academia, Dia a dia', descricao_curta: 'Energia marinha', genero: 'Masculino', fragrancia: 'Aquático', notas_olfativas: 'Água do mar, Hortelã', estoque: 25, concentracao: 'Body Splash', miniatura: false },
  { nome: '[Demonstração] Splash Vanilla', sku: 'DEMO-B-U-1', catSlug: 'body-splash', preco: 95, descricao: 'Uso versátil, Pós-banho', descricao_curta: 'Doçura suave', genero: 'Unissex', fragrancia: 'Gourmand', notas_olfativas: 'Baunilha, Leite de amêndoas', estoque: 40, concentracao: 'Body Splash', miniatura: false },

  // --- CREMES ---
  { nome: '[Demonstração] Hidratante Rose', sku: 'DEMO-C-F-1', catSlug: 'cremes', preco: 120, descricao: 'Uso diário', descricao_curta: 'Pele macia e perfumada', genero: 'Feminino', fragrancia: 'Floral', notas_olfativas: 'Rosas, Manteiga de Karité', estoque: 50, concentracao: 'Creme Hidratante', miniatura: false },
  { nome: '[Demonstração] Hidratante Amber', sku: 'DEMO-C-M-1', catSlug: 'cremes', preco: 130, descricao: 'Uso noturno', descricao_curta: 'Hidratação profunda', genero: 'Masculino', fragrancia: 'Oriental', notas_olfativas: 'Âmbar, Madeiras leves', estoque: 20, concentracao: 'Creme Hidratante', miniatura: false },

  // --- KITS ---
  { nome: '[Demonstração] Kit Presente Homem Elegante', sku: 'DEMO-K-M-1', catSlug: 'kits', preco: 550, descricao: 'Presente perfeito', descricao_curta: 'Perfume + Hidratante', genero: 'Masculino', fragrancia: 'Amadeirado', notas_olfativas: 'Variadas', estoque: 15, concentracao: 'Kit', miniatura: false },
  { nome: '[Demonstração] Kit Presente Mulher Radiante', sku: 'DEMO-K-F-1', catSlug: 'kits', preco: 620, descricao: 'Presente premium', descricao_curta: 'Perfume + Splash + Creme', genero: 'Feminino', fragrancia: 'Floral', notas_olfativas: 'Variadas', estoque: 10, concentracao: 'Kit', miniatura: false },
  { nome: '[Demonstração] Kit Casal Signature', sku: 'DEMO-K-U-1', catSlug: 'kits', preco: 990, descricao: 'Presente casal', descricao_curta: '2 Perfumes Premium', genero: 'Unissex', fragrancia: 'Variadas', notas_olfativas: 'Variadas', estoque: 5, concentracao: 'Kit', miniatura: false },
]

async function seed() {
  console.log("🌱 Iniciando Seed do Catálogo Expansivo...")

  // 1. Criar Categorias
  const catMap = new Map()
  for (const cat of CATEGORIES) {
    const upserted = await prisma.categoria.upsert({
      where: { slug: cat.slug },
      update: { nome: cat.nome },
      create: { slug: cat.slug, nome: cat.nome }
    })
    catMap.set(cat.slug, upserted.id)
    console.log(`✓ Categoria criada/verificada: ${cat.nome}`)
  }

  // 2. Limpar produtos [Demonstração] antigos para não duplicar
  await prisma.produto.deleteMany({
    where: { nome: { startsWith: '[Demonstração]' } }
  })
  console.log("🧹 Produtos de demonstração antigos limpos.")

  // 3. Injetar novos produtos
  for (const prod of DEMO_PRODUCTS) {
    const catId = catMap.get(prod.catSlug)
    await prisma.produto.create({
      data: {
        nome: prod.nome,
        slug: prod.sku.toLowerCase(),
        sku: prod.sku,
        preco: prod.preco,
        descricao: prod.descricao,
        descricao_curta: prod.descricao_curta,
        genero: prod.genero,
        fragrancia: prod.fragrancia,
        notas_olfativas: prod.notas_olfativas,
        estoque: prod.estoque,
        concentracao: prod.concentracao,
        miniatura: prod.miniatura,
        ativo: true,
        categoria_id: catId
      }
    })
  }
  console.log(`✅ ${DEMO_PRODUCTS.length} produtos de demonstração injetados com sucesso.`)
}

seed()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
