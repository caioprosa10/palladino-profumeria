export type ChatbotStep = 'CATEGORY' | 'GENDER' | 'STYLE' | 'OCCASION' | 'RECOMMENDATION' | 'END'

export interface ChatPreferences {
  categoria?: string;
  genero?: string;
  estilo?: string;
  ocasiao?: string;
  // Implicitly derived or parsed
  intensidade?: string;
  presente?: boolean;
}

export interface QuestionConfig {
  id: ChatbotStep;
  text: string;
  options: string[];
}

export interface ScoredProduct {
  product: any; // Prisma Produto
  score: number;
}

export interface EngineResult {
  products: any[];
  level: number; 
  message: string;
}
