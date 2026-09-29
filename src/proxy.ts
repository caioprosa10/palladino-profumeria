import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth'

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

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/minha-conta/:path*', '/cliente/:path*', '/checkout/:path*', '/login', '/cadastro', '/recuperar-senha'],
}
