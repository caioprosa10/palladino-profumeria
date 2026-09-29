import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando migração de SKUs...");

  // Busca todos os produtos
  const produtos = await prisma.produto.findMany({
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Encontrados ${produtos.length} produtos.`);

  // Inicializa ou pega a sequence
  let seq = await prisma.skuSequence.findUnique({ where: { id: 1 } });
  if (!seq) {
    seq = await prisma.skuSequence.create({
      data: { id: 1, valor: 0 }
    });
  }

  let currentValue = seq.valor;
  let updatedCount = 0;

  for (const p of produtos) {
    // Se o produto não começa com DX- ou se for apenas re-migração de garantia
    if (!p.sku.startsWith('DX-')) {
      currentValue += 1;
      const skuFormated = `DX-${currentValue.toString().padStart(6, '0')}`;
      
      await prisma.produto.update({
        where: { id: p.id },
        data: { sku: skuFormated }
      });
      console.log(`Produto ${p.nome} atualizado para SKU: ${skuFormated}`);
      updatedCount++;
    }
  }

  // Atualiza a sequence no final
  if (currentValue > seq.valor) {
    await prisma.skuSequence.update({
      where: { id: 1 },
      data: { valor: currentValue }
    });
  }

  console.log(`Migração concluída. ${updatedCount} produtos atualizados. Último valor: ${currentValue}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
