import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const enrichmentData: Record<string, any> = {
  // --- CREMES ---
  "HIDRATANTE YARA": { gen: "Feminino", fam: "Gourmand Frutado", notas: "Orquídea, Tangerina, Heliotrópio, Frutas Tropicais, Baunilha, Almíscar" },
  "HIDRATANTE SABAH AL WARD": { gen: "Feminino", fam: "Floral Oriental", notas: "Pimenta Rosa, Mandarina, Cacau, Flor de Laranjeira, Jasmim Sambac, Baunilha, Fava Tonka, Patchouli" },
  "HIDRATANTE SABAH SUGAR": { gen: "Feminino", fam: "Gourmand", notas: "Açúcar, Baunilha, Caramelo, Marshmallow, Musk Branco" },
  "HIDRATANTE LIQUID BRUN": { gen: "Masculino", fam: "Amadeirado Especiado", notas: "Canela, Cardamomo, Flor de Laranjeira, Baunilha Bourbon, Pralinê, Ambroxan" },
  "HIDRATANTE FAKHAR GOLD": { gen: "Feminino", fam: "Floral Frutado", notas: "Tuberosa, Jasmim, Lírio, Bergamota, Rosa, Baunilha, Sândalo" },
  "HIDRATANTE FAKHAR ROSE": { gen: "Feminino", fam: "Floral Frutado", notas: "Rosa, Romã, Jasmim, Gardênia, Tuberosa, Sândalo, Baunilha, Almíscar" },
  "HIDRATANTE ASAD BOURBON": { gen: "Masculino", fam: "Amadeirado Especiado", notas: "Baunilha, Pimenta Preta, Abacaxi, Íris, Patchouli, Âmbar" },
  "HIDRATANTE ASAD ELIXIR": { gen: "Masculino", fam: "Amadeirado Aromático", notas: "Lavanda, Cardamomo, Pimenta Preta, Sândalo, Patchouli, Vetiver" },
  "HIDRATANTE ASAD PRETO": { gen: "Masculino", fam: "Amadeirado Especiado", notas: "Pimenta Preta, Abacaxi, Tabaco, Café, Patchouli, Baunilha, Âmbar" },
  "BISNAGA HIDRAT. YARA": { gen: "Feminino", fam: "Gourmand Frutado", notas: "Orquídea, Tangerina, Baunilha, Frutas Tropicais, Almíscar" },
  "BISNAGA HIDRAT. YARA TOUS": { gen: "Feminino", fam: "Floral Frutado", notas: "Manga, Coco, Maracujá, Jasmim, Heliotrópio, Flor de Laranjeira, Baunilha, Almíscar" },
  "BISNAGA HIDRAT. CLUB MALEKA": { gen: "Feminino", fam: "Floral Oriental", notas: "Pêssego, Mandarina, Rosa, Jasmim, Baunilha, Almíscar" },
  "BISNAGA HIDRAT. COCO MOISELLE": { gen: "Feminino", fam: "Floral Chipre", notas: "Laranja, Bergamota, Rosa Turca, Jasmim, Patchouli, Baunilha" },
  "BISNAGA HIDRAT. DALILA": { gen: "Feminino", fam: "Floral Frutado", notas: "Lichia, Ruibarbo, Bergamota, Rosa, Peônia, Almíscar, Baunilha" },
  "BISNAGA HIDRAT. ANGEL": { gen: "Feminino", fam: "Oriental Gourmand", notas: "Algodão Doce, Mel, Frutas Vermelhas, Patchouli, Chocolate, Caramelo" },
  "BISNAGA HIDRAT. ASAD PRETO": { gen: "Masculino", fam: "Amadeirado Especiado", notas: "Pimenta Preta, Abacaxi, Tabaco, Café, Patchouli, Baunilha, Âmbar" },
  "BISNAGA HIDRAT. ASAD ZANZIBAR": { gen: "Masculino", fam: "Amadeirado Especiado", notas: "Baunilha, Pimenta Preta, Abacaxi, Íris, Patchouli, Âmbar" },
  "BISNAGA HIDRAT. FAKHAR BLACK": { gen: "Masculino", fam: "Fougère Aromático", notas: "Maçã, Bergamota, Gengibre, Sálvia, Lavanda, Gerânio, Fava Tonka, Cedro" },
  "BISNAGA HIDRAT. PURE EXCLUSIVE": { gen: "Masculino", fam: "Cítrico Aromático", notas: "Limão, Bergamota, Abacaxi, Almíscar, Patchouli" },
  "BISNAGA HIDRAT. SALVO": { gen: "Masculino", fam: "Fougère Aromático", notas: "Pimenta de Sichuan, Bergamota, Lavanda, Pimenta Rosa, Vetiver, Patchouli, Ambroxan" },
  "BISNAGA HIDRAT. FAKHAR GOLD": { gen: "Feminino", fam: "Floral Frutado", notas: "Tuberosa, Jasmim, Lírio, Bergamota, Rosa, Baunilha, Sândalo" },
  "HIDRATANTE QUEEN OF ARABIA 200G": { gen: "Feminino", fam: "Oriental", notas: "Açafrão, Rosa, Jasmim, Oud, Patchouli, Sândalo, Âmbar" },
  "HIDRATANTE CLUB INTENSE": { gen: "Masculino", fam: "Amadeirado Especiado", notas: "Limão, Abacaxi, Bergamota, Groselha Preta, Maçã, Jasmim, Rosa, Bétula, Musk, Âmbar, Patchouli, Baunilha" },
  "HIDRATANTE CLUB ICONIC": { gen: "Masculino", fam: "Cítrico Amadeirado", notas: "Limão, Bergamota, Hortelã, Toranja, Melão, Jasmim, Sândalo, Patchouli, Cedro" },

  // --- BODY SPLASHES ---
  "BODY SPLASH YARA": { gen: "Feminino", fam: "Gourmand Frutado", notas: "Orquídea, Tangerina, Heliotrópio, Frutas Tropicais, Baunilha, Almíscar" },
  "BODY SPLASH CLUB MALEKA": { gen: "Feminino", fam: "Floral Oriental", notas: "Pêssego, Mandarina, Rosa, Jasmim, Baunilha, Almíscar" },
  "BODY SPLASH FAKHAR ROSE": { gen: "Feminino", fam: "Floral Frutado", notas: "Rosa, Romã, Jasmim, Gardênia, Tuberosa, Sândalo, Baunilha, Almíscar" },
  "BODY SPLASH ATHEERI": { gen: "Masculino", fam: "Amadeirado Especiado", notas: "Açafrão, Rosa, Madeira de Agar (Oud), Sândalo, Patchouli, Âmbar" },
  "BODY SPLASH SABAH SUGAR": { gen: "Feminino", fam: "Gourmand", notas: "Açúcar, Baunilha, Caramelo, Marshmallow, Musk Branco" },
  "BODY SPLASH ANGEL NOVA": { gen: "Feminino", fam: "Floral Frutado", notas: "Framboesa, Lichia, Rosa Damascena, Madeira de Akigala, Benjoim" },
  "BODY SPLASH CLUB INTENSE": { gen: "Masculino", fam: "Amadeirado Especiado", notas: "Limão, Abacaxi, Bergamota, Groselha Preta, Bétula, Musk, Âmbar" },
  "BODY SPLASH LIQUID BRUN": { gen: "Masculino", fam: "Amadeirado Especiado", notas: "Canela, Cardamomo, Flor de Laranjeira, Baunilha Bourbon, Pralinê, Ambroxan" },
  "BODY SPLASH SUPREMACY": { gen: "Masculino", fam: "Amadeirado Aromático", notas: "Maçã, Bergamota, Groselha Preta, Patchouli, Musgo de Carvalho, Baunilha" },
  "BODY SPLASH FAKHAR BLACK": { gen: "Masculino", fam: "Fougère Aromático", notas: "Maçã, Bergamota, Gengibre, Sálvia, Lavanda, Gerânio, Fava Tonka, Cedro" },
  "BODY SPLASH FAKHAR GOLD": { gen: "Feminino", fam: "Floral Frutado", notas: "Tuberosa, Jasmim, Lírio, Bergamota, Rosa, Baunilha, Sândalo" },
  "BODY SPLASH ASAD PRETO": { gen: "Masculino", fam: "Amadeirado Especiado", notas: "Pimenta Preta, Abacaxi, Tabaco, Café, Patchouli, Baunilha, Âmbar" },
  "BODY SPLASH BARE VANILLA": { gen: "Feminino", fam: "Gourmand", notas: "Baunilha, Cashmeran, Flor de Maçã" },
  "BODY SPLASH COCONUT PASSION": { gen: "Feminino", fam: "Gourmand Frutado", notas: "Coco, Baunilha, Lírio-do-vale, Camomila, Aloe Vera" },
  "BODY SPLASH PURE SEDUCTION": { gen: "Feminino", fam: "Floral Frutado", notas: "Ameixa, Frésia, Camomila" },
  "BODY SPLASH LOVE SPELL": { gen: "Feminino", fam: "Floral Frutado", notas: "Flor de Cerejeira, Pêssego, Jasmim Branco" }
};

function formatDescription(isCreme: boolean, notesData: any) {
  const type = isCreme ? 'Hidratante corporal' : 'Body Splash desodorante colônia';
  const benefit = isCreme ? 'proporciona hidratação profunda e perfumação duradoura' : 'proporciona uma sensação imediata de frescor e leveza prolongada';
  
  return `**Descrição:** ${type} com fragrância elegante que ${benefit}.
  
**Família Olfativa:** ${notesData.fam}

**Notas Principais:** ${notesData.notas}.`;
}

async function main() {
  console.log("Iniciando enriquecimento de dados de Cremes e Body Splashes...");

  const targetNames = Object.keys(enrichmentData);
  let count = 0;

  for (const name of targetNames) {
    const data = enrichmentData[name];
    const isCreme = name.includes('HIDRAT') || name.includes('CREME');
    const desc = formatDescription(isCreme, data);

    const product = await prisma.produto.findFirst({
      where: { nome: name }
    });

    if (product) {
      await prisma.produto.update({
        where: { id: product.id },
        data: {
          genero: data.gen,
          fragrancia: data.fam,
          notas_olfativas: data.notas,
          descricao: desc
        }
      });
      console.log(`Enriquecido: ${name} -> Gênero: ${data.gen}, Família: ${data.fam}`);
      count++;
    } else {
      console.log(`PRODUTO NÃO ENCONTRADO: ${name}`);
    }
  }

  console.log(`Concluído. ${count} produtos enriquecidos com sucesso.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
