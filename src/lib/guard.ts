import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { decrypt } from './auth'
import { prisma } from './prisma'

/**
 * Autorização de administrador.
 *
 * O proxy (src/proxy.ts) faz a triagem das rotas, mas a própria
 * documentação do Next diz que ele não deve ser a única camada de
 * autorização — e o Next 16.2 tinha um CVE de bypass de proxy. Por isso
 * cada página e cada rota de API confere de novo por aqui.
 *
 * O papel é lido do banco, não do JWT: o token carrega o papel do momento
 * do login, então um administrador rebaixado ou desativado continuaria
 * com acesso até o token expirar.
 */

export interface AdminSession {
  id: string
  nome: string
  email: string
  role: string
}

type Resultado =
  | { ok: true; user: AdminSession }
  | { ok: false; status: 401 | 403 }

async function autenticarAdmin(apenasSuperAdmin = false): Promise<Resultado> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  if (!token) return { ok: false, status: 401 }

  const payload = await decrypt(token)
  if (!payload?.id) return { ok: false, status: 401 }

  const user = await prisma.user.findUnique({
    where: { id: payload.id as string },
    select: { id: true, nome: true, email: true, role: true, ativo: true },
  })

  // Conta apagada ou desativada depois de o token ter sido emitido.
  if (!user || !user.ativo) return { ok: false, status: 401 }

  const papeisAceitos = apenasSuperAdmin ? ['SUPERADMIN'] : ['ADMIN', 'SUPERADMIN']
  if (!papeisAceitos.includes(user.role)) {
    return { ok: false, status: 403 }
  }

  const { ativo, ...sessao } = user
  return { ok: true, user: sessao }
}

/**
 * Para Server Components de página: devolve o administrador ou redireciona.
 * Sempre use no topo de páginas sob /admin que leiam dados.
 */
export async function requireAdminPage(
  opcoes: { apenasSuperAdmin?: boolean } = {}
): Promise<AdminSession> {
  const r = await autenticarAdmin(opcoes.apenasSuperAdmin)

  if (!r.ok) {
    redirect(r.status === 401 ? '/login' : '/cliente')
  }

  return r.user
}

/**
 * Para Route Handlers: devolve o administrador, ou a resposta de erro
 * já pronta para ser retornada.
 */
export async function requireAdminApi(
  opcoes: { apenasSuperAdmin?: boolean } = {}
): Promise<
  { user: AdminSession; response?: never } | { user?: never; response: NextResponse }
> {
  const r = await autenticarAdmin(opcoes.apenasSuperAdmin)

  if (!r.ok) {
    return {
      response: NextResponse.json(
        { error: r.status === 401 ? 'Unauthorized' : 'Forbidden' },
        { status: r.status }
      ),
    }
  }

  return { user: r.user }
}
