import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth'

/**
 * CSP com nonce para as páginas do painel administrativo.
 *
 * Só no painel, e não na vitrine: o nonce obriga renderização dinâmica, e
 * medimos que aplicá-lo no site inteiro custaria a prerenderização de 13
 * das 27 páginas, incluindo a home. O painel é onde o ganho compensa —
 * é lá que existe sessão privilegiada para um XSS roubar, e essas
 * páginas já são majoritariamente dinâmicas.
 *
 * style-src segue com 'unsafe-inline' aqui: nonce não cobre atributo
 * `style`, e o painel tem centenas deles. Ver next.config.ts.
 */
function cspComNonce(nonce: string, dev: boolean): string {
  return [
    "default-src 'self'",
    // 'strict-dynamic' deixa um script autorizado carregar os seus
    // próprios, que é como o Next monta os chunks, sem precisar listar
    // cada arquivo.
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'self'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get('session')?.value

  // Rotas que exigem autenticação
  const isProtectedRoute = pathname.startsWith('/checkout') || pathname.startsWith('/cliente') || pathname.startsWith('/minha-conta')
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/cadastro') || pathname.startsWith('/recuperar-senha')

  let payload = null

  if (session) {
    payload = await decrypt(session)
  }

  // 1. Proteger Rotas do Cliente e Checkout
  if (isProtectedRoute && !payload) {
    const url = new URL('/login', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // 2. Proteger Rotas de Admin (Interface e API)
  if (isAdminRoute) {
    if (!payload) {
      if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN') {
      if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      return NextResponse.redirect(new URL('/cliente', request.url))
    }
  }

  // 3. Evitar que usuário logado acesse página de Login/Cadastro
  if (isAuthRoute && payload) {
    if (payload.role === 'ADMIN' || payload.role === 'SUPERADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return NextResponse.redirect(new URL('/cliente', request.url))
  }

  // 4. Páginas do painel recebem CSP com nonce. Rotas de API não: elas
  // devolvem JSON, que o navegador não executa.
  if (pathname.startsWith('/admin')) {
    const nonce = crypto.randomUUID()
    const politica = cspComNonce(nonce, process.env.NODE_ENV === 'development')

    // O Next lê o nonce do cabeçalho na REQUISIÇÃO e o aplica aos seus
    // próprios scripts de hidratação — é isso que dispensa 'unsafe-inline'.
    const cabecalhos = new Headers(request.headers)
    cabecalhos.set('Content-Security-Policy', politica)
    cabecalhos.set('x-nonce', nonce)

    const resposta = NextResponse.next({ request: { headers: cabecalhos } })
    // set, não append: substitui a política estática de next.config.ts.
    resposta.headers.set('Content-Security-Policy', politica)
    return resposta
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/minha-conta/:path*', '/cliente/:path*', '/checkout/:path*', '/login', '/cadastro', '/recuperar-senha'],
}
