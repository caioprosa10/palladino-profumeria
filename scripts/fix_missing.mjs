import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  await prisma.produto.updateMany({
    where: { nome: { contains: 'Yara Pink' } },
    data: { genero: 'Feminino', fragrancia: 'Gourmand Frutado', notas_olfativas: 'Orquídea, Tangerina, Heliotrópio, Frutas Tropicais, Baunilha, Almíscar', descricao: '**Descrição:** Hidratante/Splash com fragrância elegante.\n\n**Família Olfativa:** Gourmand Frutado\n\n**Notas Principais:** Orquídea, Tangerina, Baunilha.' }
  });
  await prisma.produto.updateMany({
    where: { nome: { contains: 'Sabal Al Ward' } },
    data: { genero: 'Feminino', fragrancia: 'Floral Oriental', notas_olfativas: 'Pimenta Rosa, Mandarina, Cacau, Flor de Laranjeira, Jasmim Sambac', descricao: '**Descrição:** Hidratante com fragrância elegante.\n\n**Família Olfativa:** Floral Oriental\n\n**Notas Principais:** Cacau, Jasmim, Baunilha.' }
  });
  console.log('Update done');
}
run();
