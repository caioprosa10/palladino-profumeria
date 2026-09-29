import crypto from 'crypto'

/**
 * Cifragem de dados sensíveis em repouso.
 *
 * O banco é um arquivo SQLite: quem obtiver uma cópia lê tudo em claro.
 * Tokens de integração, segredos de 2FA e CPF passam por aqui antes de
 * serem gravados.
 *
 * AES-256-GCM: além de cifrar, autentica. Um valor adulterado no banco
 * falha na verificação em vez de decifrar em lixo silenciosamente.
 */

const ALGORITMO = 'aes-256-gcm'
const TAMANHO_IV = 12 // recomendado para GCM
const TAMANHO_TAG = 16
const PREFIXO = 'enc:v1:'

let chaveCache: Buffer | null = null

/**
 * Deriva a chave de 32 bytes a partir de ENCRYPTION_KEY.
 *
 * Sem valor padrão de propósito: uma chave publicada no código não
 * protegeria nada, já que o repositório é público.
 */
function obterChave(): Buffer {
  if (chaveCache) return chaveCache

  const bruta = process.env.ENCRYPTION_KEY

  if (!bruta) {
    throw new Error(
      'ENCRYPTION_KEY não está definida. Gere uma com `openssl rand -base64 32` e adicione ao .env.'
    )
  }

  // Aceita base64 de 32 bytes ou qualquer texto longo, normalizado por SHA-256.
  const emBase64 = Buffer.from(bruta, 'base64')
  chaveCache =
    emBase64.length === 32
      ? emBase64
      : crypto.createHash('sha256').update(bruta, 'utf8').digest()

  return chaveCache
}

/** Já está cifrado? Serve para migrar dados gravados em claro. */
export function estaCifrado(valor: string | null | undefined): boolean {
  return typeof valor === 'string' && valor.startsWith(PREFIXO)
}

/** Cifra um texto. Devolve null se a entrada for nula ou vazia. */
export function cifrar(texto: string | null | undefined): string | null {
  if (texto === null || texto === undefined || texto === '') return null
  if (estaCifrado(texto)) return texto // idempotente

  const iv = crypto.randomBytes(TAMANHO_IV)
  const cipher = crypto.createCipheriv(ALGORITMO, obterChave(), iv)
  const cifrado = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return PREFIXO + Buffer.concat([iv, tag, cifrado]).toString('base64')
}

/**
 * Decifra um valor. Valores gravados antes desta mudança, ainda em claro,
 * são devolvidos como estão — assim a aplicação continua funcionando
 * enquanto os dados antigos não forem migrados.
 */
export function decifrar(valor: string | null | undefined): string | null {
  if (valor === null || valor === undefined || valor === '') return null
  if (!estaCifrado(valor)) return valor

  try {
    const dados = Buffer.from(valor.slice(PREFIXO.length), 'base64')
    const iv = dados.subarray(0, TAMANHO_IV)
    const tag = dados.subarray(TAMANHO_IV, TAMANHO_IV + TAMANHO_TAG)
    const cifrado = dados.subarray(TAMANHO_IV + TAMANHO_TAG)

    const decipher = crypto.createDecipheriv(ALGORITMO, obterChave(), iv)
    decipher.setAuthTag(tag)

    return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString('utf8')
  } catch {
    // Tag inválida: o valor foi adulterado ou a chave mudou.
    console.error('⚠️ Falha ao decifrar um valor do banco. Chave trocada ou dado corrompido.')
    return null
  }
}

/** Hash de token para guardar no banco sem armazenar o token em si. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex')
}

/** Token aleatório seguro para links de redefinição de senha. */
export function gerarToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url')
}
