export const CHATBOT_SYNONYMS: Record<string, string> = {
  // --- CATEGORY ---
  'perfume': 'perfumes',
  'fragrância': 'perfumes',
  'eau de parfum': 'perfumes',
  'eau de toilette': 'perfumes',
  'body splash': 'body-splash',
  'splash': 'body-splash',
  'colônia leve': 'body-splash',
  'creme': 'cremes',
  'hidratante': 'cremes',
  'loção': 'cremes',
  'creme hidratante': 'cremes',
  'kit': 'kits',
  'combo': 'kits',
  'kit presente': 'kits',
  'presente': 'kits', // Presente solto vai ser forçado pro fluxo de kit para ser seguro
  
  // --- GENDER ---
  'homem': 'Masculino',
  'masculino': 'Masculino',
  'rapaz': 'Masculino',
  'marido': 'Masculino',
  'namorado': 'Masculino',
  'esposo': 'Masculino',
  'pai': 'Masculino',
  'mulher': 'Feminino',
  'feminino': 'Feminino',
  'moça': 'Feminino',
  'namorada': 'Feminino',
  'esposa': 'Feminino',
  'mãe': 'Feminino',
  // --- STYLE (16 FAMÍLIAS) ---
  'floral': 'Floral',
  'flores': 'Floral',
  'rosas': 'Floral',
  
  'cítrico': 'Cítrico',
  'limão': 'Cítrico',
  'laranja': 'Cítrico',
  
  'amadeirado': 'Amadeirado',
  'madeira': 'Amadeirado',
  'cedro': 'Amadeirado',
  
  'oriental': 'Oriental',
  'árabe': 'Oriental',
  'forte': 'Oriental', // Oriental associado a forte
  
  'gourmand': 'Gourmand',
  'doce': 'Gourmand',
  'baunilha': 'Gourmand',
  'chocolate': 'Gourmand',
  'caramelo': 'Gourmand',
  
  'fresco': 'Fresco',
  'refrescante': 'Fresco',
  
  'aquático': 'Aquático',
  'água': 'Aquático',
  'marinho': 'Aquático',
  
  'aromático': 'Aromático',
  'ervas': 'Aromático',
  
  'fougère': 'Fougère',
  'barbearia': 'Fougère',
  
  'especiado': 'Especiado',
  'pimenta': 'Especiado',
  'canela': 'Especiado',
  
  'frutado': 'Frutado',
  'frutas': 'Frutado',
  'morango': 'Frutado',
  
  'adocicado': 'Adocicado', // Diferente do Gourmand denso
  'suave doce': 'Adocicado',
  
  'couro': 'Couro',
  'tabaco': 'Couro',
  
  'almiscarado': 'Almiscarado',
  'musk': 'Almiscarado',
  
  'baunilhado': 'Baunilhado',
  
  'verde': 'Verde',
  'mato': 'Verde',
  'folhas': 'Verde',
  
  'atalcado': 'Atalcado',
  'pó': 'Atalcado',
  'íris': 'Atalcado',

  // --- OCCASION ---
  'dia a dia': 'Dia a dia',
  'cotidiano': 'Dia a dia',
  'rotina': 'Dia a dia',
  'dia': 'Dia a dia',
  
  'trabalho': 'Trabalho',
  'escritório': 'Trabalho',

  'festa': 'Festa',
  'balada': 'Festa',
  
  'noite': 'Noite',
  'noturno': 'Noite',
  'encontro': 'Noite',
  
  'casamento': 'Casamento',
  'evento': 'Casamento',

  'versátil': 'Uso versátil',
  'qualquer ocasião': 'Uso versátil',
  'verão': 'Verão',
  'inverno': 'Inverno',
  'academia': 'Academia',

  // --- INTENSITY ---
  'intenso': 'Intenso',
  'marcante': 'Intenso',
  'fixação alta': 'Intenso',
  'leve': 'Leve',
  'suave': 'Leve'
};

export function matchSynonym(text: string): string | null {
  const lowerText = text.toLowerCase().trim()
  for (const [key, value] of Object.entries(CHATBOT_SYNONYMS)) {
    if (lowerText.includes(key)) {
      return value
    }
  }
  return null
}
