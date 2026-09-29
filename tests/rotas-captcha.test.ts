import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'
import { SecurityService } from '@/services/security.service'

/**
 * Comportamento das rotas com e sem Turnstile configurado.
 *
 * Importa os handlers direto, em vez de subir um servidor: o que
 * interessa é a decisão da rota, não o transporte HTTP.
 */

const SEMPRE_PASSA = '1x0000000000000000000000000000000AA'
const SEMPRE_FALHA = '2x0000000000000000000000000000000AA'
const SITE_KEY_TESTE = '1x00000000000000000000AA'

const prisma = new PrismaClient()

function requisicao(corpo: unknown, ip = '203.0.113.10') {
  return new Request('http://localhost:3000/api/x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(corpo),
  })
}

function desligarTurnstile() {
  delete process.env.TURNSTILE_SITE_KEY
  delete process.env.TURNSTILE_SECRET_KEY
}

function ligarTurnstile(secret: string) {
  process.env.TURNSTILE_SITE_KEY = SITE_KEY_TESTE
  process.env.TURNSTILE_SECRET_KEY = secret
}

beforeAll(() => {
  execSync('npx prisma migrate deploy', { stdio: 'pipe' })
})

beforeEach(async () => {
  desligarTurnstile()
  await prisma.rateLimit.deleteMany({})
  await prisma.auditoria.deleteMany({})
  await prisma.user.deleteMany({})
})

afterEach(() => {
  desligarTurnstile()
})

describe('cadastro', () => {
  it('sem Turnstile configurado, funciona como antes', async () => {
    const { POST } = await import('@/app/api/auth/register/route')

    const r = await POST(requisicao({
      nome: 'Pessoa Teste',
      email: 'sem-captcha@teste.com',
      senha: 'SenhaValida2026',
    }))

    expect(r.status).toBe(201)
    expect(await prisma.user.findUnique({ where: { email: 'sem-captcha@teste.com' } })).toBeTruthy()
  })

  it('com Turnstile ativo, recusa sem token', async () => {
    ligarTurnstile(SEMPRE_PASSA)
    const { POST } = await import('@/app/api/auth/register/route')

    const r = await POST(requisicao({
      nome: 'Pessoa Teste',
      email: 'sem-token@teste.com',
      senha: 'SenhaValida2026',
    }))

    expect(r.status).toBe(400)
    expect(await prisma.user.findUnique({ where: { email: 'sem-token@teste.com' } })).toBeNull()
  })

  it('com token válido, cadastra', async () => {
    ligarTurnstile(SEMPRE_PASSA)
    const { POST } = await import('@/app/api/auth/register/route')

    const r = await POST(requisicao({
      nome: 'Pessoa Teste',
      email: 'com-token@teste.com',
      senha: 'SenhaValida2026',
      turnstileToken: 'token-de-teste',
    }))

    expect(r.status).toBe(201)
    expect(await prisma.user.findUnique({ where: { email: 'com-token@teste.com' } })).toBeTruthy()
  }, 15000)

  it('com a chave que sempre falha, recusa e não cria a conta', async () => {
    ligarTurnstile(SEMPRE_FALHA)
    const { POST } = await import('@/app/api/auth/register/route')

    const r = await POST(requisicao({
      nome: 'Pessoa Teste',
      email: 'captcha-falhou@teste.com',
      senha: 'SenhaValida2026',
      turnstileToken: 'token-de-teste',
    }))

    expect(r.status).toBe(400)
    expect(await prisma.user.findUnique({ where: { email: 'captcha-falhou@teste.com' } })).toBeNull()

    const log = await prisma.auditoria.findFirst({ where: { acao: 'CADASTRO_CAPTCHA_FALHOU' } })
    expect(log).toBeTruthy()
  }, 15000)

  it('o honeypot continua valendo com captcha válido', async () => {
    ligarTurnstile(SEMPRE_PASSA)
    const { POST } = await import('@/app/api/auth/register/route')

    const r = await POST(requisicao({
      nome: 'Robo',
      email: 'robo@teste.com',
      senha: 'SenhaValida2026',
      website: 'http://spam.example',
      turnstileToken: 'token-de-teste',
    }))

    // Responde 201 para não ensinar o robô, mas não cria.
    expect(r.status).toBe(201)
    expect(await prisma.user.findUnique({ where: { email: 'robo@teste.com' } })).toBeNull()
  }, 15000)
})

describe('recuperação de senha', () => {
  it('sem Turnstile, responde a mensagem neutra', async () => {
    const { POST } = await import('@/app/api/auth/recover/route')

    const r = await POST(requisicao({ email: 'qualquer@teste.com' }))

    expect(r.status).toBe(200)
  })

  it('com Turnstile ativo, recusa sem token', async () => {
    ligarTurnstile(SEMPRE_PASSA)
    const { POST } = await import('@/app/api/auth/recover/route')

    const r = await POST(requisicao({ email: 'qualquer@teste.com' }))

    expect(r.status).toBe(400)
  })
})

describe('login: captcha progressivo', () => {
  it('as primeiras tentativas não exigem captcha', async () => {
    ligarTurnstile(SEMPRE_FALHA) // falharia SE fosse exigido
    const { POST } = await import('@/app/api/auth/login/route')

    // Primeira tentativa: 401 por credencial, não 400 por captcha.
    const r = await POST(requisicao({ email: 'naoexiste@teste.com', senha: 'qualquer' }))

    expect(r.status).toBe(401)
  })

  it('passa a exigir captcha depois do limiar', async () => {
    ligarTurnstile(SEMPRE_FALHA)
    const { POST } = await import('@/app/api/auth/login/route')

    const ip = '203.0.113.99'
    // Consome o contador que o próprio rate limit mantém.
    for (let i = 0; i < 3; i++) {
      await SecurityService.checkRateLimit(ip, '/api/auth/login', 10)
    }

    const r = await POST(requisicao({ email: 'naoexiste@teste.com', senha: 'q' }, ip))
    const corpo = await r.json()

    // 400 e não 401: parou no captcha, antes de checar a senha.
    expect(r.status).toBe(400)
    expect(corpo.requerCaptcha).toBe(true)
  }, 15000)

  it('avisa a interface que a próxima tentativa exigirá captcha', async () => {
    ligarTurnstile(SEMPRE_PASSA)
    const { POST } = await import('@/app/api/auth/login/route')

    const ip = '203.0.113.50'
    await SecurityService.checkRateLimit(ip, '/api/auth/login', 10)

    const r = await POST(requisicao({ email: 'naoexiste@teste.com', senha: 'q' }, ip))
    const corpo = await r.json()

    expect(r.status).toBe(401)
    expect(corpo.requerCaptcha).toBe(true)
  })

  it('não exige captcha quando o Turnstile não está configurado', async () => {
    const { POST } = await import('@/app/api/auth/login/route')

    const ip = '203.0.113.77'
    for (let i = 0; i < 5; i++) {
      await SecurityService.checkRateLimit(ip, '/api/auth/login', 10)
    }

    const r = await POST(requisicao({ email: 'naoexiste@teste.com', senha: 'q' }, ip))
    const corpo = await r.json()

    expect(r.status).toBe(401)
    expect(corpo.requerCaptcha).toBeFalsy()
  })
})
