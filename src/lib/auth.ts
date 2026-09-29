import { SignJWT, jwtVerify } from 'jose'

const secretKey = process.env.JWT_SECRET || '***REMOVIDO***'
const key = new TextEncoder().encode(secretKey)

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // Expira em 1 dia
    .sign(key)
}

export async function decrypt(token: string) {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    })
    return payload
  } catch (error) {
    return null
  }
}
