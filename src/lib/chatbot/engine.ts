import { ChatPreferences, ScoredProduct, EngineResult } from './types'

export class RecommendationEngine {
  
  static run(products: any[], prefs: ChatPreferences): EngineResult {
    // ---------------------------------------------------------
    // BARREIRA 1: CATEGORIA E GÊNERO (INTRANSPONÍVEIS)
    // ---------------------------------------------------------
    let validProducts = products.filter(p => {
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

    if (validProducts.length === 0) {
      return { products: [], level: 7, message: "No momento, não temos nenhum produto disponível para esta categoria e gênero solicitados." };
    }

    // ---------------------------------------------------------
    // ETAPA 1: MATCH PERFEITO (Gênero + Categoria + Família + Ocasião)
    // ---------------------------------------------------------
    const level1 = this.scoreProducts(validProducts, prefs, { strictStyle: !!prefs.estilo, strictOccasion: !!prefs.ocasiao, macroStyle: false });
    if (level1.length > 0) {
      return { 
        products: level1.map(s => s.product).slice(0, 3), 
        level: 1, 
        message: "Com base nas suas escolhas exatas, separei as melhores opções do nosso acervo para você." 
      };
    }

    // ---------------------------------------------------------
    // ETAPA 2: IGNORAR OCASIÃO (Gênero + Categoria + Família)
    // ---------------------------------------------------------
    const level2 = this.scoreProducts(validProducts, prefs, { strictStyle: !!prefs.estilo, strictOccasion: false, macroStyle: false });
    if (level2.length > 0) {
      return { 
        products: level2.map(s => s.product).slice(0, 3), 
        level: 2, 
        message: "Não encontrei um produto exato para essa ocasião específica, mas estas excelentes opções possuem exatamente o aroma que você procura:" 
      };
    }

    // ---------------------------------------------------------
    // ETAPA 3: FAMÍLIAS PRÓXIMAS (Macro Categorias Olfativas)
    // ---------------------------------------------------------
    const level3 = this.scoreProducts(validProducts, prefs, { strictStyle: !!prefs.estilo, strictOccasion: false, macroStyle: true });
    if (level3.length > 0) {
      return { 
        products: level3.map(s => s.product).slice(0, 3), 
        level: 3, 
        message: "No momento não encontrei um produto com essa fragrância exata. No entanto, selecionei opções com perfil aromático muito semelhante que costumam agradar esse perfil:" 
      };
    }

    // ---------------------------------------------------------
    // ETAPA 4: MAIS VENDIDOS DO GÊNERO/CATEGORIA
    // ---------------------------------------------------------
    const level4 = validProducts
      .filter(p => p.destaque === true || p.estoque < 10) // Simulando "Mais Vendidos" (estoque baixo ou destaque)
      .sort((a, b) => (b.preco || 0) - (a.preco || 0)) // Ordena por ticket
      .slice(0, 3);
    
    if (level4.length > 0) {
      return { 
        products: level4, 
        level: 4, 
        message: "Não temos essa família olfativa no momento, mas separei os Campeões de Venda absolutos desta categoria para você:" 
      };
    }

    // ---------------------------------------------------------
    // ETAPA 5 e 6: LANÇAMENTOS / NOVIDADES GERAIS (Fallback Absoluto)
    // ---------------------------------------------------------
    const level5 = validProducts.slice(0, 3); // Apenas pega os 3 primeiros que passaram no filtro duro
    return { 
      products: level5, 
      level: 5, 
      message: "Separei algumas das nossas maiores novidades nesta categoria para você conhecer:" 
    };
  }

  private static scoreProducts(
    products: any[], 
    prefs: ChatPreferences, 
    flags: { strictStyle: boolean, strictOccasion: boolean, macroStyle: boolean }
  ): ScoredProduct[] {
    
    const scored = products.map(p => {
      let score = 0;
      
      const pFam = (p.fragrancia || '').toLowerCase();
      const pNot = (p.notas_olfativas || '').toLowerCase();
      const pOca = (p.descricao || '').toLowerCase(); 
      const pNome = (p.nome || '').toLowerCase();

      // +100 Categoria & Gênero (Já filtrados antes, base)
      score += 200; 

      // +80: FAMÍLIA OLFATIVA (ou Nome)
      let hasStyle = false;
      if (prefs.estilo) {
        const uEst = prefs.estilo.toLowerCase();
        if (pFam.includes(uEst) || pNot.includes(uEst) || pNome.includes(uEst)) {
          hasStyle = true;
          score += 80;
        } else if (flags.macroStyle) {
          // NLP Expansivo
          if (uEst === 'amadeirado' && (pFam.includes('oriental') || pFam.includes('aromático') || pFam.includes('couro'))) { hasStyle = true; score += 40; }
          else if (uEst === 'cítrico' && (pFam.includes('fresco') || pFam.includes('aquático') || pFam.includes('frutado'))) { hasStyle = true; score += 40; }
          else if (uEst === 'doce' && (pFam.includes('gourmand') || pFam.includes('oriental') || pFam.includes('baunilhado'))) { hasStyle = true; score += 40; }
          else if (uEst === 'floral' && (pFam.includes('frutado') || pFam.includes('atalcado'))) { hasStyle = true; score += 40; }
        }
      } else {
        hasStyle = true; // Ignora se não pedir estilo
      }

      // +50: OCASIÃO (ou Nome)
      let hasOccasion = false;
      if (prefs.ocasiao) {
        const uOca = prefs.ocasiao.toLowerCase();
        if (pOca.includes(uOca) || pNot.includes(uOca) || pNome.includes(uOca)) {
          hasOccasion = true;
          score += 50;
        }
      } else {
        hasOccasion = true;
      }

      // Filtros
      if (flags.strictStyle && !hasStyle) return null;
      if (flags.strictOccasion && !hasOccasion) return null;

      return { product: p, score };
    });

    const validScored = scored.filter(s => s !== null) as ScoredProduct[];
    return validScored.sort((a, b) => b.score - a.score);
  }
}
