import fs from 'fs/promises'
import path from 'path'

/**
 * Gravação de imagens enviadas pelo painel administrativo.
 *
 * Nem o nome nem o Content-Type informados pelo navegador são confiáveis:
 * ambos são escolhidos por quem envia. Um arquivo salvo como .html ou .svg
 * dentro de public/ passa a ser servido como documento pela própria origem
 * do site, o que permite executar script no domínio da loja. Por isso a
 * extensão vem de uma lista fixa e é confirmada pelos bytes iniciais do
 * arquivo.
 */

const TAMANHO_MAXIMO = 8 * 1024 * 1024 // 8 MB

/** Assinaturas (magic numbers) dos formatos aceitos. */
const FORMATOS = [
  { ext: 'jpg',  confere: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png',  confere: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'gif',  confere: (b: Buffer) => b.subarray(0, 6).toString('ascii') === 'GIF89a' || b.subarray(0, 6).toString('ascii') === 'GIF87a' },
  { ext: 'webp', confere: (b: Buffer) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
  { ext: 'avif', confere: (b: Buffer) => b.subarray(4, 8).toString('ascii') === 'ftyp' && b.subarray(8, 12).toString('ascii').startsWith('avif') },
] as const

export class UploadInvalidoError extends Error {}

/**
 * Salva a imagem em public/uploads e devolve a URL pública.
 * @throws UploadInvalidoError se o arquivo exceder o limite ou não for uma imagem reconhecida.
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
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${formato.ext}`
  const uploadDir = getUploadDir()

  await fs.mkdir(uploadDir, { recursive: true })
  await fs.writeFile(path.join(uploadDir, filename), buffer)

  return `/uploads/${filename}`
}

/**
 * Onde as imagens enviadas são gravadas.
 *
 * Em desenvolvimento é public/uploads, servido estaticamente pelo Next.
 * Em produção o disco da aplicação é recriado a cada deploy, então
 * UPLOADS_DIR deve apontar para um volume persistente; nesse caso quem
 * serve os arquivos é a rota src/app/uploads/[...caminho]/route.ts.
 */
export function getUploadDir(): string {
  const configurado = process.env.UPLOADS_DIR
  return configurado && configurado.trim()
    ? path.resolve(configurado)
    : path.join(process.cwd(), 'public', 'uploads')
}
