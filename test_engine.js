const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const activeProducts = await prisma.produto.findMany({
    where: { ativo: true, estoque: { gt: 0 } },
    include: { marca: true, categoria: true }
  });
  
  const prefs = {categoria: "perfumes", genero: "Masculino", estilo: "Amadeirado", ocasiao: "Trabalho"};
  
  let validProducts = activeProducts.filter(p => {
      // 1. Filtro de Categoria
      if (prefs.categoria) {
        const pCat = (p.categoria?.slug || '').toLowerCase();
        const uCat = prefs.categoria.toLowerCase();
        if (uCat === 'perfumes') {
            if (!['masculino', 'feminino', 'nicho', 'perfumes'].includes(pCat)) return false;
        } else {
            if (pCat !== uCat) return false;
        }
      }

      // 2. Filtro de Gênero
      if (prefs.genero) {
        const pGen = (p.genero || '').toLowerCase();
        const uGen = prefs.genero.toLowerCase();

        if (uGen === 'masculino' && !(pGen.includes('masculino') || pGen.includes('homem'))) return false;
        if (uGen === 'feminino' && !(pGen.includes('feminino') || pGen.includes('mulher'))) return false;
      }

      return true;
  });
  console.log("Valid products count:", validProducts.length);
  if (validProducts.length > 0) {
    console.log("First valid product:", validProducts[0].nome, "Cat:", validProducts[0].categoria.slug, "Gen:", validProducts[0].genero);
  }
}
run();
