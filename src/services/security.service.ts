import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export class SecurityService {
  /**
   * Avalia a pontuação de risco básico de um IP
   * @param ip Endereço IP do cliente
   * @param endpoint O endpoint que está sendo acessado
   * @returns boolean - true se deve ser bloqueado, false se permitido
   */
  static async checkRateLimit(ip: string, endpoint: string, limite = 5): Promise<boolean> {
    const windowStart = new Date(Date.now() - 15 * 60 * 1000); // Janela de 15 minutos

    const count = await prisma.rateLimit.count({
      where: {
        ip,
        endpoint,
        timestamp: { gte: windowStart }
      }
    });

    // Padrão: 5 requisições por IP a cada 15 minutos (usado em pagamento).
    // O login usa um teto maior, já que escritórios compartilham um mesmo IP.
    if (count >= limite) {
      return true; // Bloqueia
    }

    // Registra a tentativa
    await prisma.rateLimit.create({
      data: {
        ip,
        endpoint
      }
    });

    return false; // Permite
  }

  /**
   * Quantas tentativas este IP fez neste endpoint na janela atual.
   *
   * Usado para decidir quando exigir o captcha no login: as primeiras
   * tentativas passam direto, e o desafio só aparece quando o padrão
   * começa a parecer automatizado.
   */
  static async contarTentativas(ip: string, endpoint: string): Promise<number> {
    const windowStart = new Date(Date.now() - 15 * 60 * 1000);

    return prisma.rateLimit.count({
      where: { ip, endpoint, timestamp: { gte: windowStart } }
    });
  }

  /**
   * Limpa rate limits antigos para evitar inchaço do banco
   */
  static async cleanOldRateLimits() {
    const oldDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 horas
    await prisma.rateLimit.deleteMany({
      where: { timestamp: { lt: oldDate } }
    });
  }

  /**
   * Verifica a assinatura criptográfica do Webhook do Mercado Pago (HMAC)
   */
  static verifyMercadoPagoSignature(signature: string, requestId: string, dataId: string, secret: string): boolean {
    if (!signature || !requestId || !dataId) return false;
    
    // O MP envia o header x-signature no formato: ts=123,v1=abc
    const parts = signature.split(',');
    let ts = '';
    let hash = '';

    parts.forEach(part => {
      const [key, value] = part.split('=');
      if (key === 'ts') ts = value;
      if (key === 'v1') hash = value;
    });

    if (!ts || !hash) return false;

    // Constrói o payload manifesto
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    
    // Calcula o HMAC SHA256 com o segredo (Webhooks Secret)
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(manifest);
    const computedHash = hmac.digest('hex');

    return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));
  }
}
