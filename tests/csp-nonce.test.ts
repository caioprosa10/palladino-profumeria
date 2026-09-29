import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'
import { encrypt } from '@/lib/auth'

/**
 * O nonce só vale se chegar às tags <script>. Quando não chega, o painel
 * fica inutilizável no navegador — foi o que aconteceu na primeira
 * tentativa, com /admin prerenderizada. O teste de ponta a ponta do HTML
 * exige servidor; aqui garantimos o contrato do proxy, que é o que
 * regrediria silenciosamente.
 */

async function requisicao(caminho: string, comSessaoAdmin = true) {
  const req = new NextRequest(`http://localhost:3000${caminho}`)

  if (comSessaoAdmin) {
    const token = await encrypt({ id: 'admin-1', email: 'a@t.com', nome: 'A', role: 'ADMIN' })
    req.cookies.set('session', token)
  }

  return proxy(req)
}

function csp(r: Response): string {
  return r.headers.get('content-security-policy') ?? ''
}

describe('CSP com nonce no painel', () => {
  it('as páginas de /admin recebem nonce', async () => {
    const r = await requisicao('/admin')

    expect(csp(r)).toMatch(/script-src 'nonce-[0-9a-f-]{36}'/)
  })

  it('usa strict-dynamic e dispensa unsafe-inline em script-src', async () => {
    const politica = csp(await requisicao('/admin/pedidos'))
    const scriptSrc = politica.split('; ').find((d) => d.startsWith('script-src'))!

    expect(scriptSrc).toContain("'strict-dynamic'")
    expect(scriptSrc).not.toContain("'unsafe-inline'")
  })

  it('o nonce é diferente em cada requisição', async () => {
    const a = csp(await requisicao('/admin'))
    const b = csp(await requisicao('/admin'))

    const extrair = (s: string) => s.match(/nonce-([0-9a-f-]{36})/)?.[1]

    expect(extrair(a)).toBeTruthy()
    expect(extrair(a)).not.toBe(extrair(b))
  })

  it('o nonce vai também no cabeçalho da requisição, que é como o Next o lê', async () => {
    // Sem isto o Next não aplica o nonce aos scripts, e tudo é bloqueado.
    const r = await requisicao('/admin')

    // O proxy devolve os cabeçalhos de requisição alterados via x-middleware-request-*.
    const doPedido = r.headers.get('x-middleware-request-content-security-policy')
      ?? r.headers.get('x-middleware-override-headers')

    expect(doPedido).toBeTruthy()
  })

  it('rotas de API do admin não recebem nonce: devolvem JSON, não HTML', async () => {
    const r = await requisicao('/api/admin/usuarios')

    expect(csp(r)).not.toContain('nonce-')
  })

  it('a vitrine pública não passa por CSP com nonce', async () => {
    // /cadastro está no matcher do proxy mas não é rota de admin.
    const r = await requisicao('/cadastro', false)

    expect(csp(r)).not.toContain('nonce-')
  })

  it('sem sessão, /admin redireciona antes de gerar nonce', async () => {
    const r = await requisicao('/admin', false)

    expect(r.status).toBe(307)
    expect(csp(r)).not.toContain('nonce-')
  })
})
