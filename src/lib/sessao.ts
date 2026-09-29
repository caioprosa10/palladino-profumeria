import { cookies } from 'next/headers'
import { decrypt } from './auth'
import { hashToken } from './cripto'
import { prisma } from './prisma'

/**
 * Sessões com registro no servidor.
 *
 * Só com o JWT, o logout apenas apaga o cookie: o token continua
 * criptograficamente válido até expirar, e não há como revogá-lo. Cada
 * login passa a registrar a sessão, e as verificações conferem se ela
 * ainda vale — o que torna o logout real e permite derrubar o acesso de
 * uma conta comprometida na hora.
 *
 * Não é usado em src/proxy.ts de propósito: o proxy roda no runtime Edge,
 * onde o Prisma não funciona. O proxy segue como triagem otimista, e a
 * verificação real acontece aqui, nas páginas e rotas.
 */

export interface SessaoValida {
  id: string
  email: string
  nome: string
  role: string
}

/** Registra a sessão emitida no login. O JWT em si nunca é gravado. */
export async function registrarSessao(params: {
  usuarioId: string
  token: string
  ip?: string | null
  userAgent?: string | null
  duracaoSegundos: number
}) {
  await prisma.sessao.create({
    data: {
      usuario_id: params.usuarioId,
      tokenHash: hashToken(params.token),
      ip: params.ip ?? null,
      userAgent: params.userAgent?.slice(0, 255) ?? null,
      expiraEm: new Date(Date.now() + params.duracaoSegundos * 1000),
    },
  })
}

/** Revoga uma sessão específica — usado no logout. */
export async function revogarSessao(token: string) {
  await prisma.sessao.updateMany({
    where: { tokenHash: hashToken(token), revogadaEm: null },
    data: { revogadaEm: new Date() },
  })
}

/** Revoga todas as sessões de um usuário. */
export async function revogarSessoesDoUsuario(usuarioId: string) {
  await prisma.sessao.updateMany({
    where: { usuario_id: usuarioId, revogadaEm: null },
    data: { revogadaEm: new Date() },
  })
}

/**
 * Lê o cookie, valida o JWT e confere se a sessão segue ativa e a conta
 * habilitada. Devolve null se qualquer uma dessas coisas falhar.
 */
export async function sessaoAtual(): Promise<SessaoValida | null> {
  const token = (await cookies()).get('session')?.value
  if (!token) return null

  const payload = await decrypt(token)
  if (!payload?.id) return null

  const registro = await prisma.sessao.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      revogadaEm: true,
      expiraEm: true,
      usuario: { select: { id: true, email: true, nome: true, role: true, ativo: true } },
    },
  })

  // Sessões emitidas antes desta mudança não têm registro. Em vez de
  // deslogar todo mundo de uma vez, elas seguem valendo com base apenas
  // no JWT até expirarem — no máximo 24 horas.
  if (!registro) {
    const usuario = await prisma.user.findUnique({
      where: { id: payload.id as string },
      select: { id: true, email: true, nome: true, role: true, ativo: true },
    })
    if (!usuario || !usuario.ativo) return null
    const { ativo, ...dados } = usuario
    return dados
  }

  if (registro.revogadaEm || registro.expiraEm < new Date()) return null
  if (!registro.usuario.ativo) return null

  const { ativo, ...dados } = registro.usuario
  return dados
}

/** Limpa sessões vencidas para o banco não crescer sem limite. */
export async function limparSessoesVencidas() {
  await prisma.sessao.deleteMany({
    where: { expiraEm: { lt: new Date() } },
  })
}
