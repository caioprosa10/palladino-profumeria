import { MercadoPagoConfig, Payment } from 'mercadopago';

// MercadoPagoConfig expects an access token.
// The access token MUST NOT be exposed to the client side.
const accessToken = process.env.MP_ACCESS_TOKEN || '***REMOVIDO-ROTACIONAR-NO-MERCADO-PAGO***';

if (!accessToken) {
  console.warn('⚠️ AVISO DE SEGURANÇA: MP_ACCESS_TOKEN não configurado nas variáveis de ambiente. Backend indisponível para cobranças reais.');
}

// Configuração estrita do SDK do Mercado Pago
export const mpClient = new MercadoPagoConfig({ 
  accessToken, 
  options: { 
    timeout: 10000
  } 
});

// Inicialização segura dos wrappers
export const paymentClient = new Payment(mpClient);
