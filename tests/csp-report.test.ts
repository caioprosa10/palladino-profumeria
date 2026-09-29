import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'
import { POST } from '@/app/api/csp-report/route'

const prisma = new PrismaClient()

function relatorio(corpo: unknown, ip = '198.51.100.7') {
  return new Request('http://localhost:3000/api/csp-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/csp-report', 'x-forwarded-for': ip },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  })
}

/** Captura o que o endpoint escreve, para conferir o que sai no log. */
function capturarAvisos() {
  const linhas: string[] = []
  const original = console.warn
  console.warn = (...a: unknown[]) => linhas.push(a.join(' '))
  return {
    linhas,
    parar: () => {
      console.warn = original
    },
  }
}

beforeAll(() => {
  execSync('npx prisma migrate deploy', { stdio: 'pipe' })
})

beforeEach(async () => {
  await prisma.rateLimit.deleteMany({})
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('endpoint de relatório de CSP', () => {
  it('aceita o formato antigo csp-report', async () => {
    const cap = capturarAvisos()
    try {
      const r = await POST(relatorio({
        'csp-report': {
          'effective-directive': 'style-src-attr',
          'blocked-uri': 'inline',
          'document-uri': 'http://localhost:3000/login',
        },
      }))

      expect(r.status).toBe(204)
      expect(cap.linhas.join('\n')).toContain('style-src-attr')
    } finally {
      cap.parar()
    }
  })

  it('aceita o formato novo da Reporting API', async () => {
    const cap = capturarAvisos()
    try {
      const r = await POST(relatorio([
        {
          type: 'csp-violation',
          body: {
            'effective-directive': 'script-src',
            'blocked-uri': 'inline',
            'document-uri': 'http://localhost:3000/',
          },
        },
      ]))

      expect(r.status).toBe(204)
      expect(cap.linhas.join('\n')).toContain('script-src')
    } finally {
      cap.parar()
    }
  })

  it('descarta a query string, que pode conter dados do usuário', async () => {
    const cap = capturarAvisos()
    try {
      await POST(relatorio({
        'csp-report': {
          'effective-directive': 'style-src',
          'blocked-uri': 'inline',
          'document-uri': 'http://localhost:3000/cliente?token=SEGREDO123&cpf=99988877766',
        },
      }))

      const tudo = cap.linhas.join('\n')
      expect(tudo).not.toContain('SEGREDO123')
      expect(tudo).not.toContain('99988877766')
      // Mas o caminho continua útil para o diagnóstico.
      expect(tudo).toContain('/cliente')
    } finally {
      cap.parar()
    }
  })

  it('aplica rate limit por IP', async () => {
    const ip = '198.51.100.200'
    const cap = capturarAvisos()

    try {
      // O limite é 30; a 31ª deve parar de registrar.
      for (let i = 0; i < 30; i++) {
        await POST(relatorio({ 'csp-report': { 'effective-directive': 'style-src' } }, ip))
      }
      const antes = cap.linhas.length

      await POST(relatorio({ 'csp-report': { 'effective-directive': 'style-src' } }, ip))

      // Ainda responde 204, mas não registra mais.
      expect(cap.linhas.length).toBe(antes)
    } finally {
      cap.parar()
    }
  }, 30000)

  it('ignora corpo malformado sem estourar', async () => {
    const r = await POST(relatorio('isto não é json'))
    expect(r.status).toBe(204)
  })

  it('ignora corpo acima do limite de tamanho', async () => {
    const cap = capturarAvisos()
    try {
      const gigante = JSON.stringify({
        'csp-report': { 'effective-directive': 'style-src', 'blocked-uri': 'x'.repeat(20000) },
      })

      const r = await POST(relatorio(gigante))

      expect(r.status).toBe(204)
      expect(cap.linhas.length).toBe(0)
    } finally {
      cap.parar()
    }
  })
})
