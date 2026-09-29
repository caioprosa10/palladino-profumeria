import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Função utilitária para gerar slug amigável
function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // remove diacritics
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

async function main() {
  console.log('Iniciando o import massivo do PDF (86 produtos)...')

  // 1. Criar ou buscar Marcas (Armaf, Afnan, Lattafa, Maison Alhambra, Rasasi, Fragrance World, Al Wataniah, Variadas)
  const marcasNomes = [
    'Armaf', 'Afnan', 'Lattafa', 'Maison Alhambra', 'Rasasi', 'Fragrance World', 'Al Wataniah', 'Variadas'
  ]
  const marcasDB: any = {}
  for (const m of marcasNomes) {
    marcasDB[m] = await prisma.marca.upsert({
      where: { slug: slugify(m) },
      update: {},
      create: { nome: m, slug: slugify(m) }
    })
  }

  // 2. Criar ou buscar Categorias
  const categoriasInput = [
    { nome: 'Perfumes Masculinos', slug: 'masculino' },
    { nome: 'Perfumes Femininos', slug: 'feminino' },
    { nome: 'Perfumes Unissex', slug: 'unissex' },
    { nome: 'Body Splash e Cremes', slug: 'body-splash' } // Unificando para não quebrar a lógica de "splash"
  ]
  const categoriasDB: any = {}
  for (const cat of categoriasInput) {
    categoriasDB[cat.slug] = await prisma.categoria.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { nome: cat.nome, slug: cat.slug }
    })
  }

  // 3. Catálogo Extraído (86 produtos rigorosamente copiados)
  const produtos = [
    // --- MASCULINOS ---
    {
      nome: 'Club de Nuit Intense Man',
      marca: 'Armaf',
      categoria: 'masculino',
      concentracao: 'EDT / EDP',
      familia: 'Amadeirado Especiado',
      notas: 'Saída: Limão, Abacaxi, Maçã | Coração: Bétula, Rosa, Jasmim | Fundo: Almíscar, Âmbar Gris, Baunilha',
      descricaoCurta: 'Um clássico moderno e magnético com abertura cítrica cortante e fundo esfumaçado.',
      descricaoDetalhada: 'Ocasiões: Eventos noturnos, trabalho, assinaturas.\nPerformance: Fixação 10h+, Projeção intensa.\nPúblico: Homens confiantes e líderes.'
    },
    {
      nome: 'Club de Nuit Blue Iconic',
      marca: 'Armaf',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Cítrico Amadeirado',
      notas: 'Saída: Toranja, Hortelã, Limão | Coração: Gengibre, Melão, Noz-moscada | Fundo: Sândalo, Âmbar, Cedro',
      descricaoCurta: 'Vibrante e revigorante, transmitindo a aura de um homem dinâmico e elegante.',
      descricaoDetalhada: 'Ocasiões: Dia a dia, verão, trabalho.\nPerformance: Fixação 8h+, Projeção forte.\nPúblico: Público jovem e adulto.'
    },
    {
      nome: "Supremacy Not Only Intense (Collector's)",
      marca: 'Afnan',
      categoria: 'masculino',
      concentracao: 'Extrait de Parfum',
      familia: 'Amadeirado Especiado',
      notas: 'Saída: Groselha Preta, Bergamota | Coração: Musgo de Carvalho, Patchouli | Fundo: Âmbar Gris, Baunilha',
      descricaoCurta: 'Versão mais densa, frutada e esfumaçada da clássica linha Supremacy.',
      descricaoDetalhada: 'Ocasiões: Encontros, festas, dias frios.\nPerformance: Fixação 12h+, Projeção marcante.\nPúblico: Homens ousados.'
    },
    {
      nome: 'Turathi Blue',
      marca: 'Afnan',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Cítrico Aromático',
      notas: 'Saída: Toranja, Mandarina | Coração: Notas Amadeiradas, Âmbar | Fundo: Almíscar, Especiarias Frescas',
      descricaoCurta: 'Frescor efervescente e luxuoso com uma base amadeirada e limpa.',
      descricaoDetalhada: 'Ocasiões: Verão, trabalho, esportes.\nPerformance: Fixação 8h+.\nPúblico: Qualquer idade, fãs de perfumes azuis.'
    },
    {
      nome: 'Asad',
      marca: 'Lattafa',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Âmbar Especiado',
      notas: 'Saída: Pimenta Preta, Abacaxi | Coração: Café, Patchouli | Fundo: Âmbar, Baunilha',
      descricaoCurta: 'Robusta, equilibra notas picantes com a doçura resinosa do âmbar. Quente e envolvente.',
      descricaoDetalhada: 'Ocasiões: Noites, baladas, encontros.\nPerformance: Fixação 9h+.\nPúblico: Homens de personalidade forte.'
    },
    {
      nome: 'Asad Zanzibar (Bourbon)',
      marca: 'Lattafa',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Amadeirado Frutado',
      notas: 'Saída: Pimenta, Lavanda | Coração: Água de Coco, Íris | Fundo: Incenso, Baunilha',
      descricaoCurta: 'Uma versão mais tropical e exótica da linha Asad, unindo frescor de coco com incenso esfumaçado.',
      descricaoDetalhada: 'Ocasiões: Tardes de verão, encontros.\nPerformance: Fixação 8h+.\nPúblico: Homens modernos e sedutores.'
    },
    {
      nome: 'Asad Elixir Edition',
      marca: 'Lattafa',
      categoria: 'masculino',
      concentracao: 'Extrait',
      familia: 'Especiado Quente',
      notas: 'Saída: Canela, Noz-Moscada | Coração: Lavanda, Cardamomo | Fundo: Alcaçuz, Sândalo',
      descricaoCurta: 'Uma concentração ainda mais profunda e especiada, focada na opulência noturna.',
      descricaoDetalhada: 'Ocasiões: Eventos de gala, inverno.\nPerformance: Fixação nuclear.\nPúblico: Homens maduros e imponentes.'
    },
    {
      nome: 'Asad Limited Edition',
      marca: 'Lattafa',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Âmbar Amadeirado',
      notas: 'Saída: Especiarias Frias | Coração: Café, Madeiras | Fundo: Benjoim, Baunilha Escura',
      descricaoCurta: 'Versão exclusiva de colecionador, com frasco e formulação aprimorados.',
      descricaoDetalhada: 'Ocasiões: Ocasiões muito especiais.\nPerformance: Fixação e projeção fortíssimas.\nPúblico: Colecionadores.'
    },
    {
      nome: 'Fakhar Black',
      marca: 'Lattafa',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Fougère Amadeirado',
      notas: 'Saída: Maçã, Bergamota | Coração: Lavanda, Sálvia | Fundo: Fava Tonka, Cedro',
      descricaoCurta: 'A representação do homem de sucesso.',
      descricaoDetalhada: 'Ocasiões: Trabalho, saídas.\nPerformance: Fixação 8h.\nPúblico: Homens modernos.'
    },
    {
      nome: 'Fakhar Platinum',
      marca: 'Lattafa',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Amadeirado Marinho',
      notas: 'Saída: Notas Oceânicas | Coração: Sálvia | Fundo: Madeira de Âmbar',
      descricaoCurta: 'Fresco e aquático.',
      descricaoDetalhada: 'Ocasiões: Verão.\nPerformance: Moderada.\nPúblico: Fãs de frescor.'
    },
    {
      nome: 'The Kingdom',
      marca: 'Lattafa',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Aromático',
      notas: 'Saída: Sálvia | Coração: Lavanda | Fundo: Vetiver',
      descricaoCurta: 'Majestoso.',
      descricaoDetalhada: 'Ocasiões: Reuniões.\nPerformance: Imponente.\nPúblico: Líderes.'
    },
    {
      nome: 'Qaed Al Fursan Preto',
      marca: 'Lattafa',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Frutado',
      notas: 'Saída: Abacaxi | Coração: Jasmim | Fundo: Musgo',
      descricaoCurta: 'Abacaxi esfumaçado.',
      descricaoDetalhada: 'Ocasiões: Casual.\nPerformance: 7h+.\nPúblico: Jovens.'
    },
    {
      nome: 'Qaed Al Fursan Marrom',
      marca: 'Lattafa',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Terroso',
      notas: 'Saída: Especiarias | Coração: Madeiras | Fundo: Âmbar',
      descricaoCurta: 'Madeiras densas.',
      descricaoDetalhada: 'Ocasiões: Noite.\nPerformance: 8h.\nPúblico: Sérios.'
    },
    {
      nome: 'His Confession',
      marca: 'Lattafa',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Amadeirado',
      notas: 'Saída: Especiarias | Coração: Lavanda | Fundo: Âmbar',
      descricaoCurta: 'Sedutor.',
      descricaoDetalhada: 'Ocasiões: Encontros.\nPerformance: 8h+.\nPúblico: Galantes.'
    },
    {
      nome: "Winner's Trophy",
      marca: 'Lattafa',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Especiado Fresco',
      notas: 'Saída: Mandarina | Coração: Baunilha | Fundo: Vetiver',
      descricaoCurta: 'Aroma de vitória.',
      descricaoDetalhada: 'Ocasiões: Escritório.\nPerformance: 8h.\nPúblico: Confiantes.'
    },
    {
      nome: 'World Cup Edition',
      marca: 'Lattafa',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Aromático',
      notas: 'Saída: Verdes | Coração: Sálvia | Fundo: Cedro',
      descricaoCurta: 'Esportivo.',
      descricaoDetalhada: 'Ocasiões: Energia.\nPerformance: 7h.\nPúblico: Jovens.'
    },
    {
      nome: 'Avant',
      marca: 'Maison Alhambra',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Frutado',
      notas: 'Saída: Abacaxi | Coração: Patchouli | Fundo: Musgo',
      descricaoCurta: 'Inspirado.',
      descricaoDetalhada: 'Ocasiões: Versátil.\nPerformance: 7h+.\nPúblico: Atitude.'
    },
    {
      nome: 'Perseus Exclusif',
      marca: 'Maison Alhambra',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Amêndoa',
      notas: 'Saída: Bergamota | Coração: Amêndoa | Fundo: Sândalo',
      descricaoCurta: 'Aristocrático.',
      descricaoDetalhada: 'Ocasiões: Formais.\nPerformance: Excelente.\nPúblico: Cavalheiros.'
    },
    {
      nome: 'The Panther',
      marca: 'Maison Alhambra',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Verde',
      notas: 'Saída: Limão | Coração: Lírio | Fundo: Madeiras',
      descricaoCurta: 'Esportivo.',
      descricaoDetalhada: 'Ocasiões: Diurno.\nPerformance: 7h.\nPúblico: Esportistas.'
    },
    {
      nome: 'Venom',
      marca: 'Maison Alhambra',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Amadeirado Escuro',
      notas: 'Saída: Pimenta | Coração: Lavanda | Fundo: Oud',
      descricaoCurta: 'Perigosa.',
      descricaoDetalhada: 'Ocasiões: Baladas.\nPerformance: 9h.\nPúblico: Sedutores.'
    },
    {
      nome: 'Hawas Black',
      marca: 'Rasasi',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Especiado',
      notas: 'Saída: Maçã | Coração: Especiarias | Fundo: Âmbar',
      descricaoCurta: 'Obscura.',
      descricaoDetalhada: 'Ocasiões: Noite.\nPerformance: Estrondosas.\nPúblico: Festeiros.'
    },
    {
      nome: 'Hawas Ice',
      marca: 'Rasasi',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Aquático',
      notas: 'Saída: Limão | Coração: Hortelã | Fundo: Almíscar',
      descricaoCurta: 'Glacial.',
      descricaoDetalhada: 'Ocasiões: Escaldantes.\nPerformance: Longa.\nPúblico: Modernos.'
    },
    {
      nome: 'Jubilant',
      marca: 'Fragrance World',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Amadeirado',
      notas: 'Saída: Olíbano | Coração: Orquídea | Fundo: Oud',
      descricaoCurta: 'Complexo.',
      descricaoDetalhada: 'Ocasiões: Gala.\nPerformance: Altíssima.\nPúblico: Clássicos.'
    },
    {
      nome: 'Watani Intense',
      marca: 'Al Wataniah',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Amadeirado',
      notas: 'Saída: Cravo | Coração: Canela | Fundo: Madeiras',
      descricaoCurta: 'Exótico.',
      descricaoDetalhada: 'Ocasiões: Frias.\nPerformance: Nuclear.\nPúblico: Ousados.'
    },
    {
      nome: 'Watani Tradicional',
      marca: 'Al Wataniah',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Fresco',
      notas: 'Saída: Cítricos | Coração: Verdes | Fundo: Madeira',
      descricaoCurta: 'Fresco.',
      descricaoDetalhada: 'Ocasiões: Trabalho.\nPerformance: 7h.\nPúblico: Polidos.'
    },
    {
      nome: 'Liquid Brun',
      marca: 'Fragrance World',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Amadeirado',
      notas: 'Saída: Cardamomo | Coração: Pralinê | Fundo: Baunilha',
      descricaoCurta: 'Aconchegante.',
      descricaoDetalhada: 'Ocasiões: Românticos.\nPerformance: 9h+.\nPúblico: Atenção.'
    },
    {
      nome: 'Vulcan Feu',
      marca: 'Fragrance World',
      categoria: 'masculino',
      concentracao: 'EDP',
      familia: 'Couro',
      notas: 'Saída: Noz-moscada | Coração: Couro | Fundo: Fumaça',
      descricaoCurta: 'Magma.',
      descricaoDetalhada: 'Ocasiões: Gélidos.\nPerformance: Excelente.\nPúblico: Bad boy.'
    },

    // --- FEMININOS ---
    {
      nome: 'Club de Nuit Woman',
      marca: 'Armaf',
      categoria: 'feminino',
      concentracao: 'EDP',
      familia: 'Floral Chipre',
      notas: 'Saída: Toranja, Pêssego | Coração: Rosa, Gerânio | Fundo: Patchouli, Baunilha',
      descricaoCurta: 'Opulenta e de extrema classe, com um ar maduro e elegante guiado pela rosa e patchouli.',
      descricaoDetalhada: 'Ocasiões: Ambiente corporativo, eventos.\nPerformance: Fixação 8h+.\nPúblico: Mulheres executivas e independentes.'
    },
    {
      nome: 'Yara (Clássico)',
      marca: 'Lattafa',
      categoria: 'feminino',
      concentracao: 'EDP',
      familia: 'Floral Frutado Gourmand',
      notas: 'Saída: Orquídea, Tangerina | Coração: Frutas Tropicais | Fundo: Baunilha, Almíscar',
      descricaoCurta: 'Cremoso e delicado, semelhante a um milkshake de morango com baunilha.',
      descricaoDetalhada: 'Ocasiões: Uso diário.\nPerformance: Fixação 7h.\nPúblico: Mulheres que amam perfumes cremosos.'
    },
    {
      nome: 'Yara Tous',
      marca: 'Lattafa',
      categoria: 'feminino',
      concentracao: 'EDP',
      familia: 'Frutado Tropical',
      notas: 'Saída: Manga, Coco, Maracujá | Coração: Jasmim, Flor de Laranjeira | Fundo: Baunilha, Cashmeran',
      descricaoCurta: 'Um coquetel tropical ensolarado, as férias de verão engarrafadas.',
      descricaoDetalhada: 'Ocasiões: Dias de praia, verão.\nPerformance: Fixação 6h a 8h.\nPúblico: Mulheres radiantes.'
    },
    {
      nome: 'Durrat Al Aroos',
      marca: 'Lattafa',
      categoria: 'feminino',
      concentracao: 'EDP',
      familia: 'Oriental Baunilha',
      notas: 'Saída: Almíscar Branco | Coração: Baunilha, Rosa | Fundo: Âmbar, Sândalo',
      descricaoCurta: 'Delicado, romântico e limpo.',
      descricaoDetalhada: 'Ocasiões: Casamentos, uso diário de luxo.\nPerformance: Fixação 8h+.\nPúblico: Mulheres de classe.'
    },
    {
      nome: 'Fakhar Gold',
      marca: 'Lattafa',
      categoria: 'feminino',
      concentracao: 'EDP',
      familia: 'Floral Branco',
      notas: 'Saída: Tuberosa | Coração: Jasmim, Ylang | Fundo: Baunilha',
      descricaoCurta: 'Sensual, focado em flores brancas.',
      descricaoDetalhada: 'Ocasiões: Eventos.\nPerformance: Fixação alta.\nPúblico: Glamour.'
    },
    {
      nome: 'Fakhar Rose',
      marca: 'Lattafa',
      categoria: 'feminino',
      concentracao: 'EDP',
      familia: 'Floral Frutado',
      notas: 'Saída: Romã | Coração: Rosa, Peônia | Fundo: Almíscar',
      descricaoCurta: 'Feminilidade pura.',
      descricaoDetalhada: 'Ocasiões: Encontros.\nPerformance: Fixação 7h.\nPúblico: Mulheres delicadas.'
    },
    {
      nome: 'Ameerat Rosa',
      marca: 'Lattafa',
      categoria: 'feminino',
      concentracao: 'EDP',
      familia: 'Frutado',
      notas: 'Saída: Morango | Coração: Rosa | Fundo: Baunilha',
      descricaoCurta: 'Princesa da Arábia.',
      descricaoDetalhada: 'Ocasiões: Primavera.\nPerformance: 8h.\nPúblico: Delicadas.'
    },
    {
      nome: 'Ameerat Vermelho',
      marca: 'Lattafa',
      categoria: 'feminino',
      concentracao: 'EDP',
      familia: 'Floral Branco',
      notas: 'Saída: Maçã | Coração: Flores | Fundo: Sândalo',
      descricaoCurta: 'Vibrante.',
      descricaoDetalhada: 'Ocasiões: Festas.\nPerformance: 8h+.\nPúblico: Radiantes.'
    },
    {
      nome: 'Ameerat Azul',
      marca: 'Lattafa',
      categoria: 'feminino',
      concentracao: 'EDP',
      familia: 'Fresco',
      notas: 'Saída: Cítricos | Coração: Peônia | Fundo: Almíscar',
      descricaoCurta: 'Frescor.',
      descricaoDetalhada: 'Ocasiões: Escritório.\nPerformance: 7h.\nPúblico: Sofisticadas.'
    },
    {
      nome: 'La Vivacité',
      marca: 'Lattafa',
      categoria: 'feminino',
      concentracao: 'EDP',
      familia: 'Floral',
      notas: 'Saída: Mandarina | Coração: Flores | Fundo: Madeiras',
      descricaoCurta: 'Elegante.',
      descricaoDetalhada: 'Ocasiões: Casual.\nPerformance: 7h.\nPúblico: Jovem.'
    },
    {
      nome: 'Affection',
      marca: 'Lattafa',
      categoria: 'feminino',
      concentracao: 'EDP',
      familia: 'Gourmand',
      notas: 'Saída: Pistache | Coração: Lírio | Fundo: Baunilha',
      descricaoCurta: 'Reconfortante.',
      descricaoDetalhada: 'Ocasiões: Frio.\nPerformance: 8h.\nPúblico: Fãs de pistache.'
    },
    {
      nome: 'Amina',
      marca: 'Lattafa',
      categoria: 'feminino',
      concentracao: 'EDP',
      familia: 'Ambarado',
      notas: 'Saída: Bergamota | Coração: Flores | Fundo: Âmbar',
      descricaoCurta: 'Ambarado suave.',
      descricaoDetalhada: 'Ocasiões: Encontros.\nPerformance: 7h.\nPúblico: Maduras.'
    },
    {
      nome: 'Her Confession',
      marca: 'Lattafa',
      categoria: 'feminino',
      concentracao: 'EDP',
      familia: 'Oriental Gourmand',
      notas: 'Saída: Pêssego | Coração: Flores | Fundo: Baunilha',
      descricaoCurta: 'Inesquecível.',
      descricaoDetalhada: 'Ocasiões: Noite.\nPerformance: 8h+.\nPúblico: Sedutoras.'
    },
    {
      nome: 'Queen of Arabia',
      marca: 'Lattafa',
      categoria: 'feminino',
      concentracao: 'EDP',
      familia: 'Oriental',
      notas: 'Saída: Frutas | Coração: Rosa | Fundo: Baunilha',
      descricaoCurta: 'Realeza.',
      descricaoDetalhada: 'Ocasiões: Especiais.\nPerformance: Alta.\nPúblico: Rainhas.'
    },
    {
      nome: 'Intrude',
      marca: 'Maison Alhambra',
      categoria: 'feminino',
      concentracao: 'EDP',
      familia: 'Floral Branco',
      notas: 'Saída: Laranjeira | Coração: Tuberosa | Fundo: Baunilha',
      descricaoCurta: 'Ousado.',
      descricaoDetalhada: 'Ocasiões: Noite.\nPerformance: Forte.\nPúblico: Modernas.'
    },
    {
      nome: 'So Candid',
      marca: 'Maison Alhambra',
      categoria: 'feminino',
      concentracao: 'EDP',
      familia: 'Gourmand',
      notas: 'Saída: Laranjeira | Coração: Tuberosa | Fundo: Lácteas',
      descricaoCurta: 'Voluptuosa.',
      descricaoDetalhada: 'Ocasiões: Glamour.\nPerformance: Alta.\nPúblico: Ousadas.'
    },
    {
      nome: 'Sabah Al Ward',
      marca: 'Al Wataniah',
      categoria: 'feminino',
      concentracao: 'EDP',
      familia: 'Floral',
      notas: 'Saída: Mandarina | Coração: Cacau | Fundo: Baunilha',
      descricaoCurta: 'Envolvente.',
      descricaoDetalhada: 'Ocasiões: Românticos.\nPerformance: 8h+.\nPúblico: Misteriosas.'
    },
    {
      nome: 'Sabah Sugar',
      marca: 'Al Wataniah',
      categoria: 'feminino',
      concentracao: 'EDP',
      familia: 'Gourmand',
      notas: 'Saída: Vermelhas | Coração: Algodão Doce | Fundo: Baunilha',
      descricaoCurta: 'Jovial.',
      descricaoDetalhada: 'Ocasiões: Passeios.\nPerformance: 7h.\nPúblico: Jovens.'
    },

    // --- UNISSEX ---
    {
      nome: 'Club de Nuit Maleka (Sillage/Milestone Variação)',
      marca: 'Armaf',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Aromático Fresco',
      notas: 'Saída: Cítricos, Notas Verdes | Coração: Acordes Florais | Fundo: Almíscar, Madeiras',
      descricaoCurta: 'Fragrância revigorante e unissex, com perfil fresco e versátil, adaptando-se perfeitamente à pele.',
      descricaoDetalhada: 'Ocasiões: Uso diário, climas amenos.\nPerformance: Fixação moderada-longa.\nPúblico: Amantes de frescor e versatilidade.'
    },
    {
      nome: 'Club de Nuit Precieux 1',
      marca: 'Armaf',
      categoria: 'unissex',
      concentracao: 'Extrait de Parfum',
      familia: 'Oriental Amadeirado',
      notas: 'Saída: Bergamota, Pimenta Rosa | Coração: Jasmim, Tuberosas, Madeiras Brancas | Fundo: Âmbar, Baunilha, Oud Sutil',
      descricaoCurta: 'Extrato de perfume luxuoso e denso, com ingredientes selecionados para máxima opulência.',
      descricaoDetalhada: 'Ocasiões: Ocasiões especiais, noite.\nPerformance: Fixação nuclear.\nPúblico: Público exigente e sofisticado.'
    },
    {
      nome: 'Club de Nuit Milestone',
      marca: 'Armaf',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Amadeirado Floral Almiscarado',
      notas: 'Saída: Notas Oceânicas, Frutas Vermelhas | Coração: Sândalo, Madeiras Brancas | Fundo: Almíscar, Vetiver',
      descricaoCurta: 'Aroma marinho luxuoso com toque frutado, remetendo ao frescor do Mediterrâneo.',
      descricaoDetalhada: 'Ocasiões: Dias quentes, passeios ao ar livre.\nPerformance: Fixação 8h+.\nPúblico: Pessoas que buscam elegância tropical.'
    },
    {
      nome: 'Khamrah',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Âmbar Especiado Gourmand',
      notas: 'Saída: Canela, Bergamota | Coração: Tâmaras, Pralinê | Fundo: Baunilha, Mirra',
      descricaoCurta: 'Poção gourmand irresistível com doçura de tâmaras cristalizadas e especiarias.',
      descricaoDetalhada: 'Ocasiões: Inverno, festas noturnas.\nPerformance: Fixação 12h+.\nPúblico: Fãs de perfumes extremamente doces.'
    },
    {
      nome: 'Khamrah Qahwa',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Gourmand (Café)',
      notas: 'Saída: Cardamomo, Gengibre | Coração: Pralinê, Frutas Cristalizadas | Fundo: Café Arábico, Baunilha',
      descricaoCurta: 'O DNA do best-seller Khamrah com uma adição profunda e torrada de café árabe.',
      descricaoDetalhada: 'Ocasiões: Noites frias, jantares.\nPerformance: Fixação 10h+.\nPúblico: Amantes de fragrâncias com café.'
    },
    {
      nome: 'Khamrah (Variação)',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Âmbar Especiado',
      notas: 'Saída: Canela, Noz-moscada | Coração: Tâmaras | Fundo: Baunilha, Âmbar',
      descricaoCurta: 'O clássico sucesso da perfumaria oriental com notas doces e licorosas.',
      descricaoDetalhada: 'Ocasiões: Noite, inverno.\nPerformance: Fixação excelente.\nPúblico: Público geral.'
    },
    {
      nome: 'Al Bareeq',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Oriental Gourmand',
      notas: 'Saída: Caramelo, Frutas | Coração: Notas Florais | Fundo: Âmbar, Baunilha',
      descricaoCurta: 'Doce e marcante, com um brilho gourmand.',
      descricaoDetalhada: 'Ocasiões: Festas e saídas casuais.\nPerformance: Fixação 8h.\nPúblico: Jovens e adultos.'
    },
    {
      nome: 'Vintage Radio',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Amadeirado',
      notas: 'Saída: Ameixa | Coração: Palo Santo | Fundo: Sândalo',
      descricaoCurta: 'Obra-prima mística.',
      descricaoDetalhada: 'Ocasiões: Outono.\nPerformance: Fixação 9h.\nPúblico: Nicho.'
    },
    {
      nome: 'Ghala',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Oriental',
      notas: 'Saída: Especiarias | Coração: Rosa, Oud | Fundo: Almíscar',
      descricaoCurta: 'Mistura atemporal.',
      descricaoDetalhada: 'Ocasiões: Noite.\nPerformance: Alta.\nPúblico: Oriental.'
    },
    {
      nome: 'Qaed Al Fursan Branco',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Floral',
      notas: 'Saída: Coco | Coração: Jasmim | Fundo: Sândalo',
      descricaoCurta: 'Tropical e cremoso.',
      descricaoDetalhada: 'Ocasiões: Verão.\nPerformance: 7h.\nPúblico: Gourmand.'
    },
    {
      nome: 'Hala / Human Pride',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Especiado',
      notas: 'Saída: Noz-moscada | Coração: Incenso | Fundo: Ládano',
      descricaoCurta: 'Misterioso.',
      descricaoDetalhada: 'Ocasiões: Inverno.\nPerformance: Intensa.\nPúblico: Colecionadores.'
    },
    {
      nome: 'Sheikh Shuyukh Luxe',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Oriental',
      notas: 'Saída: Canela | Coração: Caramelo | Fundo: Baunilha',
      descricaoCurta: 'Doce e resinoso.',
      descricaoDetalhada: 'Ocasiões: Luxuosos.\nPerformance: 10h+.\nPúblico: Amantes de doces.'
    },
    {
      nome: 'Musamam White',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Amadeirado',
      notas: 'Saída: Especiarias | Coração: Sândalo | Fundo: Âmbar',
      descricaoCurta: 'Cremoso.',
      descricaoDetalhada: 'Ocasiões: Diária.\nPerformance: Longa.\nPúblico: Fãs de sândalo.'
    },
    {
      nome: 'Lazuli',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Aromático',
      notas: 'Saída: Tabaco | Coração: Especiarias | Fundo: Baunilha',
      descricaoCurta: 'Luxo.',
      descricaoDetalhada: 'Ocasiões: Noite.\nPerformance: 9h+.\nPúblico: Refinado.'
    },
    {
      nome: 'Al Noble Preto',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Frutado',
      notas: 'Saída: Maçã | Coração: Chocolate | Fundo: Oud',
      descricaoCurta: 'Intrigante.',
      descricaoDetalhada: 'Ocasiões: Noite.\nPerformance: 9h+.\nPúblico: Cativantes.'
    },
    {
      nome: 'Al Noble Verde',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Verde',
      notas: 'Saída: Bergamota | Coração: Ervas | Fundo: Vetiver',
      descricaoCurta: 'Botânico.',
      descricaoDetalhada: 'Ocasiões: Primavera.\nPerformance: 7h+.\nPúblico: Fãs de verde.'
    },
    {
      nome: 'Al Noble Marrom',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Amadeirado',
      notas: 'Saída: Pimenta | Coração: Cravo | Fundo: Âmbar',
      descricaoCurta: 'Nobreza.',
      descricaoDetalhada: 'Ocasiões: Outono.\nPerformance: 10h+.\nPúblico: Clássicos.'
    },
    {
      nome: "Bade'e Al Oud Glory",
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Oriental',
      notas: 'Saída: Açafrão | Coração: Oud | Fundo: Oud',
      descricaoCurta: 'Potente.',
      descricaoDetalhada: 'Ocasiões: Gala.\nPerformance: Nuclear.\nPúblico: Líderes.'
    },
    {
      nome: "Bade'e Al Oud Amethyst",
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Floral',
      notas: 'Saída: Rosa | Coração: Rosa | Fundo: Baunilha',
      descricaoCurta: 'Aveludado.',
      descricaoDetalhada: 'Ocasiões: Noites.\nPerformance: 10h+.\nPúblico: Fãs de rosa.'
    },
    {
      nome: "Bade'e Al Oud Honor",
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Gourmand',
      notas: 'Saída: Abacaxi | Coração: Canela | Fundo: Baunilha',
      descricaoCurta: 'Surpreendente.',
      descricaoDetalhada: 'Ocasiões: Festas.\nPerformance: 9h+.\nPúblico: Ousados.'
    },
    {
      nome: 'Opulent Dubai',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Oriental',
      notas: 'Saída: Açafrão | Coração: Oud | Fundo: Baunilha',
      descricaoCurta: 'Opulência.',
      descricaoDetalhada: 'Ocasiões: Luxuosas.\nPerformance: 12h+.\nPúblico: Árabes.'
    },
    {
      nome: 'Summers',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Cítrico',
      notas: 'Saída: Limão | Coração: Notas Aquáticas | Fundo: Almíscar',
      descricaoCurta: 'Fresco.',
      descricaoDetalhada: 'Ocasiões: Calor.\nPerformance: Moderada.\nPúblico: Verão.'
    },
    {
      nome: 'Teriaq',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Gourmand',
      notas: 'Saída: Caramelo | Coração: Mel | Fundo: Couro',
      descricaoCurta: 'Complexo.',
      descricaoDetalhada: 'Ocasiões: Sofisticados.\nPerformance: 10h+.\nPúblico: Nicho.'
    },
    {
      nome: 'Art of Arabia 1',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Fresco',
      notas: 'Saída: Cítricos | Coração: Chá | Fundo: Almíscar',
      descricaoCurta: 'Tradição.',
      descricaoDetalhada: 'Ocasiões: Amenas.\nPerformance: 7h.\nPúblico: Refrescantes.'
    },
    {
      nome: 'Art of Arabia 2',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Amadeirado',
      notas: 'Saída: Especiarias | Coração: Rosa | Fundo: Oud',
      descricaoCurta: 'Equilíbrio.',
      descricaoDetalhada: 'Ocasiões: Sociais.\nPerformance: 9h.\nPúblico: Classe.'
    },
    {
      nome: 'Art of Arabia 3',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Amadeirado',
      notas: 'Saída: Olíbano | Coração: Tabaco | Fundo: Âmbar',
      descricaoCurta: 'Incenso.',
      descricaoDetalhada: 'Ocasiões: Noite.\nPerformance: 10h+.\nPúblico: Colecionadores.'
    },
    {
      nome: 'Emeer',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Amadeirado',
      notas: 'Saída: Limão | Coração: Chá | Fundo: Cashmeran',
      descricaoCurta: 'Puro luxo.',
      descricaoDetalhada: 'Ocasiões: Versátil.\nPerformance: Longa.\nPúblico: Sofisticados.'
    },
    {
      nome: 'Musamam Black',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Amadeirado',
      notas: 'Saída: Especiarias | Coração: Coração | Fundo: Oud',
      descricaoCurta: 'Elegância.',
      descricaoDetalhada: 'Ocasiões: Noite.\nPerformance: 8h+.\nPúblico: Fãs Lattafa.'
    },
    {
      nome: 'Afeef',
      marca: 'Lattafa',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Fresco',
      notas: 'Saída: Limão | Coração: Jasmim | Fundo: Almíscar',
      descricaoCurta: 'Limpo.',
      descricaoDetalhada: 'Ocasiões: Dia.\nPerformance: 6h.\nPúblico: Limpeza.'
    },
    {
      nome: 'Baroque Rouge',
      marca: 'Maison Alhambra',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Âmbar',
      notas: 'Saída: Açafrão | Coração: Âmbar | Fundo: Cedro',
      descricaoCurta: 'Mágico.',
      descricaoDetalhada: 'Ocasiões: Premium.\nPerformance: Longa.\nPúblico: Luxo.'
    },
    {
      nome: 'Baroque Extrait',
      marca: 'Maison Alhambra',
      categoria: 'unissex',
      concentracao: 'Extrait',
      familia: 'Amêndoa',
      notas: 'Saída: Amêndoa | Coração: Jasmim | Fundo: Âmbar Gris',
      descricaoCurta: 'Denso.',
      descricaoDetalhada: 'Ocasiões: Gala.\nPerformance: Extrema.\nPúblico: Seleto.'
    },
    {
      nome: 'Philos Centro',
      marca: 'Maison Alhambra',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Amadeirado',
      notas: 'Saída: Abacaxi | Coração: Íris | Fundo: Vetiver',
      descricaoCurta: 'Clássico.',
      descricaoDetalhada: 'Ocasiões: Trabalho.\nPerformance: 8h+.\nPúblico: Executivos.'
    },
    {
      nome: 'Philos Shine',
      marca: 'Maison Alhambra',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Fresco',
      notas: 'Saída: Laranja | Coração: Flores | Fundo: Madeiras',
      descricaoCurta: 'Radiante.',
      descricaoDetalhada: 'Ocasiões: Verão.\nPerformance: 7h.\nPúblico: Otimistas.'
    },
    {
      nome: 'Sceptre Amazonite',
      marca: 'Maison Alhambra',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Amadeirado',
      notas: 'Saída: Mandarina | Coração: Íris | Fundo: Madeiras',
      descricaoCurta: 'Polvoroso.',
      descricaoDetalhada: 'Ocasiões: Frias.\nPerformance: 9h+.\nPúblico: Misteriosas.'
    },
    {
      nome: 'Sceptre Oceania',
      marca: 'Maison Alhambra',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Marinho',
      notas: 'Saída: Salgadas | Coração: Sálvia | Fundo: Almíscar',
      descricaoCurta: 'Oceânico.',
      descricaoDetalhada: 'Ocasiões: Verão.\nPerformance: 7h.\nPúblico: Energia.'
    },
    {
      nome: 'Attar Collection',
      marca: 'Variadas',
      categoria: 'unissex',
      concentracao: 'Óleo',
      familia: 'Oriental',
      notas: 'Saída: Especiarias | Coração: Rosa | Fundo: Oud',
      descricaoCurta: 'Tradicional.',
      descricaoDetalhada: 'Ocasiões: Contemplação.\nPerformance: Eterna.\nPúblico: Nicho.'
    },
    {
      nome: 'Spectre Ghost',
      marca: 'Fragrance World',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Ambarado',
      notas: 'Saída: Cardamomo | Coração: Incenso | Fundo: Baunilha',
      descricaoCurta: 'Frio e quente.',
      descricaoDetalhada: 'Ocasiões: Nicho.\nPerformance: 9h+.\nPúblico: Enigmáticas.'
    },
    {
      nome: 'Dream of Haze',
      marca: 'Fragrance World',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Aromático',
      notas: 'Saída: Bergamota | Coração: Chá Verde | Fundo: Almíscar',
      descricaoCurta: 'Nebuloso.',
      descricaoDetalhada: 'Ocasiões: Primavera.\nPerformance: Moderada.\nPúblico: Leve.'
    },
    {
      nome: 'Oud Mystery',
      marca: 'Al Wataniah',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Amadeirado',
      notas: 'Saída: Quentes | Coração: Resinas | Fundo: Oud',
      descricaoCurta: 'Mistério.',
      descricaoDetalhada: 'Ocasiões: Inverno.\nPerformance: Longa.\nPúblico: Oud.'
    },
    {
      nome: 'N2',
      marca: 'Fragrance World',
      categoria: 'unissex',
      concentracao: 'EDP',
      familia: 'Aldeídico',
      notas: 'Saída: Aldeídos | Coração: Rosa | Fundo: Sândalo',
      descricaoCurta: 'Vintage.',
      descricaoDetalhada: 'Ocasiões: Formais.\nPerformance: Longa.\nPúblico: Vintage chic.'
    },

    // --- BODY SPLASH E CREMES ---
    {
      nome: 'Yara Pink (Body Splash / Creme)',
      marca: 'Lattafa',
      categoria: 'body-splash',
      concentracao: 'Body Splash',
      familia: 'Floral Gourmand',
      notas: 'Saída: Orquídea | Coração: Morango, Chantilly | Fundo: Baunilha',
      descricaoCurta: 'Extensão da linha Yara para cuidados corporais.',
      descricaoDetalhada: 'Ocasiões: Pós-banho, layering.\nPerformance: Fixação moderada.\nPúblico: Rotina perfumada completa.'
    }
  ]

  let processados = 0

  for (const item of produtos) {
    const slug = slugify(item.nome)
    const sku = `CAT-GLOBAL-${processados.toString().padStart(3, '0')}-${slug.substring(0, 8).toUpperCase()}`

    // Tratamento de gênero baseado na categoria (para facilitar compatibilidade)
    let generoStr = 'Unissex'
    if (item.categoria === 'masculino') generoStr = 'Masculino'
    if (item.categoria === 'feminino') generoStr = 'Feminino'

    // Garantir concatenação da descrição completa com notas olfativas se quiser
    const descricaoCompleta = `${item.descricaoCurta}\n\n${item.descricaoDetalhada}\n\nNotas Olfativas:\n${item.notas}`

    await prisma.produto.upsert({
      where: { slug: slug },
      update: {
        nome: item.nome,
        sku: sku,
        descricao: descricaoCompleta,
        descricao_curta: item.descricaoCurta,
        preco: 399.90, // Preço genérico conforme discutido
        estoque: 10,
        volume_ml: 100,
        concentracao: item.concentracao,
        genero: generoStr,
        fragrancia: item.familia, // Importante para o motor do Chatbot
        notas_olfativas: item.notas,
        categoria_id: categoriasDB[item.categoria].id,
        marca_id: marcasDB[item.marca]?.id,
        ativo: true
      },
      create: {
        nome: item.nome,
        slug: slug,
        sku: sku,
        descricao: descricaoCompleta,
        descricao_curta: item.descricaoCurta,
        preco: 399.90, // Preço genérico
        estoque: 10,
        volume_ml: 100,
        concentracao: item.concentracao,
        genero: generoStr,
        fragrancia: item.familia,
        notas_olfativas: item.notas,
        categoria_id: categoriasDB[item.categoria].id,
        marca_id: marcasDB[item.marca]?.id,
        ativo: true
      }
    })

    processados++
  }

  console.log(`\n✅ Sucesso! Foram cadastrados/atualizados ${processados} produtos no banco de dados.`)
}

main()
  .catch((e) => {
    console.error('Erro durante o import:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
