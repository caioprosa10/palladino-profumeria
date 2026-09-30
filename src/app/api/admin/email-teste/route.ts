import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/guard'
import { EmailService } from '@/services/email.service'
import { AuditService } from '@/services/audit.service'
import { SecurityService } from '@/services/security.service'
import { ipDaRequisicao } from '@/lib/validacao'

/**
 * Dispara um e-mail de teste para o próprio administrador.
 *
 * O destinatário vem da sessão, não do corpo da requisição: aceitar um
 * endereço arbitrário transformaria o painel num relay de spam. Com rate
 * limit, porque cada chamada gasta cota do provedor.
 */
export async function POST(req: Request) {
  const auth = await requireAdminApi()
  if (auth.response) return auth.response

  const ip = ipDaRequisicao(req)

  if (await SecurityService.checkRateLimit(ip, '/api/admin/email-teste', 5)) {
    return NextResponse.json(
      { error: 'Muitos testes seguidos. Aguarde alguns minutos.' },
      { status: 429 }
    )
  }

  if (!EmailService.configurado()) {
    return NextResponse.json(
      { error: 'SMTP não configurado. Defina SMTP_HOST, SMTP_USER e SMTP_PASS.' },
      { status: 400 }
    )
  }

  try {
    await EmailService.sendTest(auth.user.email, auth.user.nome)

    await AuditService.log({
      acao: 'EMAIL_TESTE_ENVIADO',
      ip,
      endpoint: '/api/admin/email-teste',
      resultado: auth.user.id,
    })

    return NextResponse.json({ enviado: true, para: auth.user.email })
  } catch (e: unknown) {
    // O erro do provedor ajuda a diagnosticar e só é visto por quem já é
    // administrador, mas a senha do SMTP é removida antes de sair daqui:
    // alguns servidores a repetem na mensagem de recusa.
    const senha = process.env.SMTP_PASS
    let detalhe = String((e as Error)?.message ?? 'erro desconhecido')
    if (senha) detalhe = detalhe.split(senha).join('***')
    detalhe = detalhe.slice(0, 200)

    await AuditService.log({
      acao: 'EMAIL_TESTE_FALHOU',
      ip,
      endpoint: '/api/admin/email-teste',
      resultado: detalhe,
    })

    return NextResponse.json(
      { error: 'Não foi possível enviar. Verifique as credenciais do SMTP.', detalhe },
      { status: 502 }
    )
  }
}
