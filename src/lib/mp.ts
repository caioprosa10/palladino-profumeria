import { MercadoPagoConfig, Payment } from 'mercadopago';

// O access token dá acesso total à conta de cobrança e nunca pode ser
// exposto ao cliente nem embutido no código — este arquivo é versionado.
const accessToken = process.env.MP_ACCESS_TOKEN;

if (!accessToken) {
  console.warn('⚠️ MP_ACCESS_TOKEN não configurado. Cobranças reais indisponíveis.');
}

// Configuração estrita do SDK do Mercado Pago
export const mpClient = new MercadoPagoConfig({ 
  accessToken: accessToken ?? '', 
  options: { 
    timeout: 10000
  } 
});

// Inicialização segura dos wrappers
export const paymentClient = new Payment(mpClient);
