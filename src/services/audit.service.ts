import { prisma } from '@/lib/prisma';

export class AuditService {
  /**
   * Registra uma ação no log de auditoria, garantindo imutabilidade e rastreabilidade
   * @param params 
   */
  static async log(params: {
    acao: string;
    ip?: string | null;
    endpoint?: string | null;
    resultado?: string | null;
    userAgent?: string | null;
  }) {
    try {
      await prisma.auditoria.create({
        data: {
          acao: params.acao,
          ip: params.ip || '0.0.0.0',
          endpoint: params.endpoint || 'unknown',
          resultado: params.resultado || 'success',
          userAgent: params.userAgent || 'unknown',
        }
      });
    } catch (e) {
      // Falhas no log não devem derrubar o sistema, mas devem gerar alerta fatal no backend
      console.error('⚠️ [FALHA CRÍTICA DE AUDITORIA] Falha ao registrar log:', e);
    }
  }
}
