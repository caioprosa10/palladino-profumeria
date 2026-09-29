import { NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Leitura validada do corpo de uma requisição.
 *
 * Duas coisas que faltavam nas rotas: um teto de tamanho — sem ele um POST
 * grande o bastante consome a memória do servidor — e um schema, para que
 * tipos inesperados não cheguem à lógica de negócio.
 */

/** 100 KB cobre com folga qualquer payload JSON legítimo da aplicação. */
const TAMANHO_MAXIMO_JSON = 100 * 1024

export class CorpoInvalidoError extends Error {
  constructor(message: string, readonly status: 400 | 413 = 400) {
    super(message)
  }
}

/**
 * Lê o corpo como JSON, recusando o que exceder o limite, e valida contra
 * o schema. Devolve os dados já tipados.
 */
export async function lerCorpo<T extends z.ZodType>(
  req: Request,
  schema: T
): Promise<z.infer<T>> {
  const declarado = req.headers.get('content-length')
  if (declarado && Number(declarado) > TAMANHO_MAXIMO_JSON) {
    throw new CorpoInvalidoError('Requisição muito grande.', 413)
  }

  const texto = await req.text()

  // O content-length é informado pelo cliente e pode mentir; o tamanho real
  // é o que vale.
  if (texto.length > TAMANHO_MAXIMO_JSON) {
    throw new CorpoInvalidoError('Requisição muito grande.', 413)
  }

  let bruto: unknown
  try {
    bruto = JSON.parse(texto)
  } catch {
    throw new CorpoInvalidoError('Corpo da requisição inválido.')
  }

  const r = schema.safeParse(bruto)
  if (!r.success) {
    throw new CorpoInvalidoError(r.error.issues[0].message)
  }

  return r.data
}

/** Converte o erro em resposta, ou devolve null se não for erro de corpo. */
export function respostaDeCorpoInvalido(erro: unknown): NextResponse | null {
  if (erro instanceof CorpoInvalidoError) {
    return NextResponse.json({ error: erro.message }, { status: erro.status })
  }
  return null
}

/** IP do cliente, considerando o proxy da hospedagem. */
export function ipDaRequisicao(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'
}
