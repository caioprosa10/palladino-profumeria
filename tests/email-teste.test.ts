import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'
import { encrypt } from '@/lib/auth'
import { hashToken } from '@/lib/cripto'

const prisma = new PrismaClient()

/**
 * `cookies()` do next/headers só funciona dentro de um escopo de
 * requisição do Next, que não existe ao chamar o handler direto. O mock
 * devolve o cookie que o teste definir.
 */
let cookieDaSessao: string | undefined

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (nome: string) =>
      nome === 'session' && cookieDaSessao ? { name: nome, value: cookieDaSessao } : undefined,
    set: () => {},
    delete: () => {},
  }),
  headers: async () => new Headers(),
}))

const guardado = {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
}

/** Cria um admin com sessão registrada e devolve o cookie pronto. */
async function sessaoDeAdmin() {
  const admin = await prisma.user.create({
    data: {
      nome: 'Admin Teste',
      email: 'admin.email@teste.com',
      senha: 'hash',
      role: 'ADMIN',
      ativo: true,
    },
  })

  const token = await encrypt({ id: admin.id, email: admin.email, nome: admin.nome, role: 'ADMIN' })

  await prisma.sessao.create({
    data: {
      usuario_id: admin.id,
      tokenHash: hashToken(token),
      expiraEm: new Date(Date.now() + 86400000),
    },
  })

  return { admin, token }
}

function requisicao(token?: string, ip = '203.0.113.30') {
  cookieDaSessao = token
  return new Request('http://localhost:3000/api/admin/email-teste', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
  })
}

beforeAll(() => {
  execSync('npx prisma migrate deploy', { stdio: 'pipe' })
})

beforeEach(async () => {
  await prisma.sessao.deleteMany({})
  await prisma.auditoria.deleteMany({})
  await prisma.rateLimit.deleteMany({})
  await prisma.user.deleteMany({})
  cookieDaSessao = undefined
  delete process.env.SMTP_HOST
  delete process.env.SMTP_USER
  delete process.env.SMTP_PASS
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(async () => {
  Object.assign(process.env, guardado)
  await prisma.$disconnect()
})

describe('e-mail de teste do painel', () => {
  it('exige sessão de administrador', async () => {
    const { POST } = await import('@/app/api/admin/email-teste/route')

    const r = await POST(requisicao())

    expect(r.status).toBe(401)
  })

  it('recusa quando o usuário não é admin', async () => {
    const cliente = await prisma.user.create({
      data: { nome: 'Cliente', email: 'c@t.com', senha: 'h', role: 'CUSTOMER', ativo: true },
    })
    const token = await encrypt({ id: cliente.id, email: cliente.email, nome: cliente.nome, role: 'CUSTOMER' })
    await prisma.sessao.create({
      data: { usuario_id: cliente.id, tokenHash: hashToken(token), expiraEm: new Date(Date.now() + 86400000) },
    })

    const { POST } = await import('@/app/api/admin/email-teste/route')
    const r = await POST(requisicao(token))

    expect(r.status).toBe(403)
  })

  it('avisa com clareza quando o SMTP não está configurado', async () => {
    const { token } = await sessaoDeAdmin()
    const { POST } = await import('@/app/api/admin/email-teste/route')

    const r = await POST(requisicao(token))
    const corpo = await r.json()

    expect(r.status).toBe(400)
    expect(corpo.error).toContain('SMTP_HOST')
  })

  it('envia para o e-mail da própria sessão, não para um informado', async () => {
    const { admin, token } = await sessaoDeAdmin()
    process.env.SMTP_HOST = 'smtp.exemplo.com'
    process.env.SMTP_USER = 'u'
    process.env.SMTP_PASS = 'p'

    const { EmailService } = await import('@/services/email.service')
    const espiao = vi.spyOn(EmailService, 'sendTest').mockResolvedValue({} as never)

    const { POST } = await import('@/app/api/admin/email-teste/route')
    const r = await POST(requisicao(token))
    const corpo = await r.json()

    expect(r.status).toBe(200)
    expect(corpo.para).toBe(admin.email)
    expect(espiao).toHaveBeenCalledWith(admin.email, admin.nome)
  })

  it('não expõe a senha do SMTP na mensagem de erro', async () => {
    const { token } = await sessaoDeAdmin()
    process.env.SMTP_HOST = 'smtp.exemplo.com'
    process.env.SMTP_USER = 'usuario'
    process.env.SMTP_PASS = 'SENHA-SUPER-SECRETA-123'

    const { EmailService } = await import('@/services/email.service')
    // Alguns servidores repetem a credencial na recusa.
    vi.spyOn(EmailService, 'sendTest').mockRejectedValue(
      new Error('535 Auth failed for usuario:SENHA-SUPER-SECRETA-123')
    )

    const { POST } = await import('@/app/api/admin/email-teste/route')
    const r = await POST(requisicao(token))
    const corpo = await r.json()

    expect(r.status).toBe(502)
    expect(JSON.stringify(corpo)).not.toContain('SENHA-SUPER-SECRETA-123')
    expect(corpo.detalhe).toContain('***')

    // Nem no log de auditoria.
    const log = await prisma.auditoria.findFirst({ where: { acao: 'EMAIL_TESTE_FALHOU' } })
    expect(log?.resultado).not.toContain('SENHA-SUPER-SECRETA-123')
  })

  it('aplica rate limit', async () => {
    const { token } = await sessaoDeAdmin()
    process.env.SMTP_HOST = 'smtp.exemplo.com'
    process.env.SMTP_USER = 'u'
    process.env.SMTP_PASS = 'p'

    const { EmailService } = await import('@/services/email.service')
    vi.spyOn(EmailService, 'sendTest').mockResolvedValue({} as never)

    const { POST } = await import('@/app/api/admin/email-teste/route')

    const ip = '203.0.113.31'
    for (let i = 0; i < 5; i++) {
      await POST(requisicao(token, ip))
    }

    const r = await POST(requisicao(token, ip))
    expect(r.status).toBe(429)
  })
})

describe('link de redefinição', () => {
  it('usa APP_URL e não o header Host', async () => {
    // Sem APP_URL a rota recusa gerar o link, em vez de cair no Host.
    const guardadoUrl = process.env.APP_URL
    delete process.env.APP_URL

    try {
      const u = await prisma.user.create({
        data: { nome: 'U', email: 'reset@teste.com', senha: 'h', ativo: true },
      })

      const { POST } = await import('@/app/api/auth/recover/route')

      const req = new Request('http://localhost:3000/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', host: 'evil.example.com', 'x-forwarded-for': '203.0.113.40' },
        body: JSON.stringify({ email: u.email }),
      })

      const r = await POST(req)

      // Resposta neutra de sempre, e nenhum token emitido.
      expect(r.status).toBe(200)
      expect(await prisma.tokenSenha.count({ where: { usuario_id: u.id } })).toBe(0)
    } finally {
      if (guardadoUrl) process.env.APP_URL = guardadoUrl
    }
  })
})
