import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'
import { saveImage, lerImagem, apagarImagem, UploadInvalidoError } from '@/lib/upload'
import { GET } from '@/app/uploads/[...caminho]/route'

const prisma = new PrismaClient()

/** PNG mínimo válido: assinatura de 8 bytes mais um pouco de corpo. */
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32, 7),
])

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(32, 3)])

function arquivo(nome: string, conteudo: Buffer, tipo = 'image/png'): File {
  return new File([new Uint8Array(conteudo)], nome, { type: tipo })
}

function pedir(nome: string) {
  return GET(new Request(`http://localhost:3000/uploads/${nome}`), {
    params: Promise.resolve({ caminho: [nome] }),
  })
}

beforeAll(() => {
  execSync('npx prisma migrate deploy', { stdio: 'pipe' })
})

beforeEach(async () => {
  await prisma.arquivo.deleteMany({})
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('gravação de imagens', () => {
  it('guarda no banco e devolve a URL pública', async () => {
    const url = await saveImage(arquivo('foto.png', PNG))

    expect(url).toMatch(/^\/uploads\/\d+-[0-9a-f]{12}\.png$/)

    const guardado = await prisma.arquivo.findFirst()
    expect(guardado?.tipo).toBe('image/png')
    expect(guardado?.tamanho).toBe(PNG.length)
    expect(Buffer.from(guardado!.conteudo)).toEqual(PNG)
  })

  it('não reaproveita nada do nome original', async () => {
    const url = await saveImage(arquivo('../../etc/passwd.png', PNG))

    expect(url).not.toContain('..')
    expect(url).not.toContain('passwd')
  })

  it('confia nos bytes, não no Content-Type informado', async () => {
    // Diz que é PNG, mas o conteúdo é HTML.
    const html = Buffer.from('<script>alert(1)</script>')

    await expect(saveImage(arquivo('evil.png', html, 'image/png'))).rejects.toThrow(
      UploadInvalidoError
    )

    expect(await prisma.arquivo.count()).toBe(0)
  })

  it('recusa SVG, que executaria script na origem', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')

    await expect(saveImage(arquivo('x.svg', svg, 'image/svg+xml'))).rejects.toThrow(
      /não é uma imagem válida/
    )
  })

  it('aceita os formatos previstos e grava o MIME correto', async () => {
    await saveImage(arquivo('a.jpg', JPEG, 'image/jpeg'))

    const g = await prisma.arquivo.findFirst()
    // A extensão vem dos bytes, não do nome.
    expect(g?.nome.endsWith('.jpg')).toBe(true)
    expect(g?.tipo).toBe('image/jpeg')
  })

  it('recusa arquivo acima do limite', async () => {
    const grande = Buffer.concat([PNG, Buffer.alloc(9 * 1024 * 1024)])

    await expect(saveImage(arquivo('grande.png', grande))).rejects.toThrow(/excede o limite/)
  })

  it('apagarImagem remove do banco', async () => {
    const url = await saveImage(arquivo('foto.png', PNG))
    const nome = url.replace('/uploads/', '')

    await apagarImagem(nome)

    expect(await lerImagem(nome)).toBeNull()
  })
})

describe('rota que serve as imagens', () => {
  it('devolve o conteúdo com o tipo e os cabeçalhos de segurança', async () => {
    const url = await saveImage(arquivo('foto.png', PNG))
    const nome = url.replace('/uploads/', '')

    const r = await pedir(nome)

    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe('image/png')
    expect(r.headers.get('x-content-type-options')).toBe('nosniff')
    // Nada executa a partir daqui, mesmo que algo escape da validação.
    expect(r.headers.get('content-security-policy')).toContain('sandbox')
    expect(Buffer.from(await r.arrayBuffer())).toEqual(PNG)
  })

  it('404 para arquivo inexistente', async () => {
    const r = await pedir('1700000000-aabbccddeeff.png')
    expect(r.status).toBe(404)
  })

  it('recusa nome fora do formato gerado pelo servidor', async () => {
    for (const nome of [
      'qualquer.png',
      '../../.env',
      '..%2F..%2Fetc%2Fpasswd',
      'foto.html',
      'foto.svg',
      '1700000000-ZZZZZZZZZZZZ.png',
    ]) {
      const r = await pedir(nome)
      expect(r.status, nome).toBe(404)
    }
  })

  it('recusa caminho com mais de um segmento', async () => {
    const r = await GET(new Request('http://localhost:3000/uploads/a/b'), {
      params: Promise.resolve({ caminho: ['a', 'b'] }),
    })

    expect(r.status).toBe(404)
  })

  it('não serve conteúdo cujo tipo no banco não seja de imagem', async () => {
    // Simula registro adulterado direto no banco.
    await prisma.arquivo.create({
      data: {
        nome: '1700000001-aabbccddeeff.png',
        tipo: 'text/html',
        tamanho: 4,
        conteudo: Buffer.from('<h1>'),
      },
    })

    const r = await pedir('1700000001-aabbccddeeff.png')
    expect(r.status).toBe(404)
  })
})
