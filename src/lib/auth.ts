import crypto from 'crypto'
import { SignJWT, jwtVerify } from 'jose'

const MIN_SECRET_LENGTH = 32

let cachedKey: Uint8Array | null = null

/**
 * Lê e valida o JWT_SECRET sob demanda.
 *
 * Não existe valor padrão de propósito: com o repositório público, qualquer
 * segredo embutido no código permitiria a um terceiro assinar um token de
 * SUPERADMIN e assumir o painel administrativo.
 */
function getKey(): Uint8Array {
  if (cachedKey) return cachedKey

  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error(
      'JWT_SECRET não está definida. Gere uma com `openssl rand -base64 48` e adicione ao .env.'
    )
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET precisa ter no mínimo ${MIN_SECRET_LENGTH} caracteres (recebeu ${secret.length}).`
    )
  }

  cachedKey = new TextEncoder().encode(secret)
  return cachedKey
}

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    // Identificador único por token. Sem ele, dois logins do mesmo usuário
    // no mesmo segundo produzem o MESMO token — iat tem granularidade de
    // segundos —, e o registro da sessão colide na coluna tokenHash.
    .setJti(crypto.randomUUID())
    .setExpirationTime('1d') // Expira em 1 dia
    .sign(getKey())
}

export async function decrypt(token: string) {
  // Fora do try: um erro de configuração deve estourar, e não ser
  // confundido com um token inválido.
  const key = getKey()

  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    })
    return payload
  } catch {
    return null
  }
}
