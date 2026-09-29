import { RecommendationEngine } from './src/lib/chatbot/engine'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function runTests() {
  const activeProducts = await prisma.produto.findMany({
    where: { ativo: true, estoque: { gt: 0 } },
    include: { categoria: true }
  })

  const testCases = [
    { name: 'Perfume + Homem + Amadeirado + Trabalho', prefs: { categoria: 'perfumes', genero: 'Masculino', estilo: 'Amadeirado', ocasiao: 'Trabalho' } },
    { name: 'Perfume + Mulher + Floral + Dia', prefs: { categoria: 'perfumes', genero: 'Feminino', estilo: 'Floral', ocasiao: 'Dia' } },
    { name: 'Body Splash + Mulher + Doce', prefs: { categoria: 'body-splash', genero: 'Feminino', estilo: 'Doce' } },
    { name: 'Creme + Mulher + Baunilha', prefs: { categoria: 'cremes', genero: 'Feminino', estilo: 'Baunilha' } },
    { name: 'Kit + Homem', prefs: { categoria: 'kits', genero: 'Masculino' } },
    { name: 'Perfume + Unissex + Cítrico + Verão', prefs: { categoria: 'perfumes', genero: 'Unissex', estilo: 'Cítrico', ocasiao: 'Verão' } }
  ]

  let allPassed = true;

  for (const tc of testCases) {
    const result = RecommendationEngine.run(activeProducts, tc.prefs)
    console.log(`\n--- Test: ${tc.name} ---`)
    console.log(`Level: ${result.level} | Msg: ${result.message}`)
    
    let failed = false;
    for (const p of result.products) {
      const pCat = p.categoria?.slug || '';
      console.log(` -> [${pCat}] [${p.genero}] ${p.nome} (${p.fragrancia})`)
      
      const pGen = (p.genero || '').toLowerCase()
      const uGen = tc.prefs.genero.toLowerCase()
      
      // Validação de Categoria (Estrita)
      if (pCat !== tc.prefs.categoria) failed = true

      // Validação de Gênero (Estrita)
      if (uGen === 'feminino' && !pGen.includes('feminino') && !pGen.includes('mulher') && !pGen.includes('unissex')) failed = true
      if (uGen === 'masculino' && !pGen.includes('masculino') && !pGen.includes('homem') && !pGen.includes('unissex')) failed = true
      if (uGen === 'unissex' && !pGen.includes('unissex')) failed = true
    }

    if (failed || result.products.length === 0) {
      if (result.products.length === 0) console.error(`❌ FAILED: Retornou VAZIO para ${tc.name}`)
      else console.error(`❌ FAILED: Categoria ou Genero errado vazou no fallback de ${tc.name}`)
      allPassed = false;
    } else {
      console.log(`✅ PASSED`)
    }
  }

  if (allPassed) {
    console.log("\n✅ ALL TESTS PASSED STRICTLY.")
  } else {
    console.error("\n❌ TESTS FAILED.")
  }
}

runTests()
