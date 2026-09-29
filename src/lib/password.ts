import bcrypt from 'bcryptjs'
import { z } from 'zod'

/**
 * Política de senha e hashing, em um lugar só.
 *
 * O custo do bcrypt fica gravado dentro do próprio hash, então aumentá-lo
 * não invalida as senhas já cadastradas: elas continuam validando com o
 * custo antigo e só são regravadas quando o usuário troca a senha.
 */

const CUSTO_BCRYPT = 12

/** Senhas mais usadas em vazamentos; barrá-las custa pouco e evita o pior. */
const PROIBIDAS = new Set([
  'senha123456', '1234567890', '123456789', 'password', 'password123',
  'qwertyuiop', 'administrador', 'palladino', 'perfumaria',
])

export const senhaSchema = z
  .string()
  .min(10, 'A senha deve ter no mínimo 10 caracteres')
  .max(128, 'A senha deve ter no máximo 128 caracteres')
  .refine((s) => !PROIBIDAS.has(s.toLowerCase()), 'Escolha uma senha menos previsível')
  .refine((s) => /[a-zA-Z]/.test(s) && /[0-9]/.test(s), 'A senha deve conter letras e números')

export function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, CUSTO_BCRYPT)
}

export function conferirSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash)
}
