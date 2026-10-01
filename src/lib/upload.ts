import crypto from 'crypto'
import { prisma } from './prisma'

/**
 * Gravação de imagens enviadas pelo painel administrativo.
 *
 * Nem o nome nem o Content-Type informados pelo navegador são confiáveis:
 * ambos são escolhidos por quem envia. Um arquivo salvo como .html ou .svg
 * e servido pela própria origem do site permitiria executar script no
 * domínio da loja. Por isso a extensão vem de uma lista fixa e é
 * confirmada pelos bytes iniciais do arquivo.
 *
 * O conteúdo vai para o banco, não para o disco: no plano gratuito do
 * Render o sistema de arquivos da aplicação é recriado a cada deploy, e
 * uploads em disco desapareceriam. Como efeito colateral bem-vindo, o
 * backup do banco passa a cobrir as imagens.
 */

const TAMANHO_MAXIMO = 8 * 1024 * 1024 // 8 MB

/** Assinaturas (magic numbers) dos formatos aceitos. */
const FORMATOS = [
  { ext: 'jpg',  mime: 'image/jpeg', confere: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png',  mime: 'image/png',  confere: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'gif',  mime: 'image/gif',  confere: (b: Buffer) => b.subarray(0, 6).toString('ascii') === 'GIF89a' || b.subarray(0, 6).toString('ascii') === 'GIF87a' },
  { ext: 'webp', mime: 'image/webp', confere: (b: Buffer) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
  { ext: 'avif', mime: 'image/avif', confere: (b: Buffer) => b.subarray(4, 8).toString('ascii') === 'ftyp' && b.subarray(8, 12).toString('ascii').startsWith('avif') },
] as const

export class UploadInvalidoError extends Error {}

/**
 * Guarda a imagem e devolve a URL pública.
 * @throws UploadInvalidoError se exceder o limite ou não for imagem reconhecida.
 */
export async function saveImage(file: File): Promise<string> {
  if (file.size > TAMANHO_MAXIMO) {
    throw new UploadInvalidoError(
      `A imagem "${file.name}" excede o limite de ${TAMANHO_MAXIMO / 1024 / 1024} MB.`
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const formato = FORMATOS.find((f) => f.confere(buffer))
  if (!formato) {
    throw new UploadInvalidoError(
      `"${file.name}" não é uma imagem válida. Aceitamos JPEG, PNG, GIF, WebP e AVIF.`
    )
  }

  // Nome gerado por nós: nada do nome original é reaproveitado.
  const nome = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${formato.ext}`

  await prisma.arquivo.create({
    data: {
      nome,
      tipo: formato.mime,
      tamanho: buffer.length,
      conteudo: buffer,
    },
  })

  return `/uploads/${nome}`
}

export interface ArquivoGuardado {
  conteudo: Buffer
  tipo: string
}

/** Busca um arquivo pelo nome que aparece na URL. */
export async function lerImagem(nome: string): Promise<ArquivoGuardado | null> {
  const r = await prisma.arquivo.findUnique({
    where: { nome },
    select: { conteudo: true, tipo: true },
  })

  if (!r) return null

  return { conteudo: Buffer.from(r.conteudo), tipo: r.tipo }
}

/** Remove um arquivo. Usado ao excluir o produto que o referencia. */
export async function apagarImagem(nome: string): Promise<void> {
  await prisma.arquivo.deleteMany({ where: { nome } })
}
