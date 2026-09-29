import { QuestionConfig } from './types'

export const CHATBOT_QUESTIONS: Record<string, QuestionConfig> = {
  'CATEGORY': {
    id: 'CATEGORY',
    text: "O que você está procurando hoje?",
    options: ["Perfumes", "Body Splash", "Cremes Hidratantes"]
  },
  'GENDER': {
    id: 'GENDER',
    text: "Para quem seria?",
    options: ["Masculino", "Feminino"]
  },
  'GENDER_KIT': {
    id: 'GENDER',
    text: "Este kit será para presente de:",
    options: ["Homem", "Mulher", "Casal"]
  },
  'STYLE_PERFUME': {
    id: 'STYLE',
    text: "Qual estilo de fragrância costuma agradar mais?",
    options: ["Amadeirado", "Cítrico", "Floral", "Oriental", "Aromático", "Gourmand", "Fresco", "Especiado"]
  },
  'STYLE_SPLASH': {
    id: 'STYLE',
    text: "Para o Body Splash, qual família olfativa você prefere?",
    options: ["Floral", "Frutado", "Doce", "Cítrico", "Aquático", "Verde"]
  },
  'STYLE_CREAM': {
    id: 'STYLE',
    text: "Qual perfil aromático você prefere para o hidratante?",
    options: ["Baunilha", "Floral", "Frutado", "Amadeirado", "Sem perfume"]
  },
  'OCCASION': {
    id: 'OCCASION',
    text: "Em qual ocasião esse produto será mais utilizado?",
    options: ["Dia a dia", "Trabalho", "Noite", "Festa", "Academia", "Uso versátil"]
  }
};

export const CHATBOT_MESSAGES = {
  greeting: "Olá! 👋 Sou o Consultor Virtual da Palladino Profumeria. Vou ajudar você a encontrar o produto perfeito no nosso catálogo.",
  fallback: "Desculpe, não consegui identificar sua preferência. Por favor, escolha uma das opções abaixo.",
  error: "Houve um problema de conexão. Por favor, tente novamente."
};
