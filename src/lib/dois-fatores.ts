import crypto from 'crypto'
import { generateSecret, generateURI, verifySync } from 'otplib'
import { cifrar, decifrar } from './cripto'

/**
 * Segundo fator (TOTP), compatível com Google Authenticator, Authy e 1Password.
 *
 * Existe porque senha sozinha é ponto único de falha no painel: uma senha
 * vazada em outro site e reutilizada aqui entregaria a loja inteira.
 *
 * O segredo e os códigos de recuperação são guardados cifrados — quem
 * obtiver o arquivo do banco não consegue gerar códigos válidos.
 */

const EMISSOR = 'Palladino Profumeria'

// Tolerância de 30 s (uma janela TOTP) para cobrir relógios levemente
// dessincronizados sem alargar demais a brecha.
const TOLERANCIA_SEGUNDOS = 30

export function gerarSegredo(): string {
  return generateSecret()
}

/** URI otpauth:// que o aplicativo autenticador lê no QR code. */
export function montarUri(email: string, segredo: string): string {
  return generateURI({ issuer: EMISSOR, label: email, secret: segredo })
}

/**
 * Confere um código de 6 dígitos.
 *
 * Nunca lança: um segredo corrompido ou código malformado resulta em
 * false, não em erro 500.
 */
export function conferirCodigo(codigo: string, segredoCifrado: string | null): boolean {
  const segredo = decifrar(segredoCifrado)
  if (!segredo) return false

  const limpo = codigo.replace(/\D/g, '')
  if (limpo.length !== 6) return false

  try {
    // verifySync usa comparação de tempo constante internamente.
    return verifySync({
      secret: segredo,
      token: limpo,
      epochTolerance: TOLERANCIA_SEGUNDOS,
    }).valid
  } catch {
    return false
  }
}

/** Códigos de recuperação, para quando o aparelho é perdido. */
export function gerarCodigosBackup(quantidade = 8): string[] {
  return Array.from({ length: quantidade }, () =>
    crypto.randomBytes(5).toString('hex').toUpperCase().match(/.{1,5}/g)!.join('-')
  )
}

export function cifrarCodigosBackup(codigos: string[]): string {
  return cifrar(codigos.join(','))!
}

/**
 * Consome um código de recuperação. Devolve a lista restante, já cifrada,
 * ou null se o código não valer. Uso único por definição.
 */
export function consumirCodigoBackup(
  codigo: string,
  backupCifrado: string | null
): { restantes: string } | null {
  const claro = decifrar(backupCifrado)
  if (!claro) return null

  const lista = claro.split(',').filter(Boolean)
  const normalizado = codigo.trim().toUpperCase()

  const indice = lista.findIndex((c) => c === normalizado)
  if (indice === -1) return null

  lista.splice(indice, 1)
  return { restantes: lista.length ? cifrarCodigosBackup(lista) : '' }
}
