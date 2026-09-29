import fs from 'fs'
import path from 'path'

/**
 * Ambiente de teste isolado.
 *
 * O banco de testes é um arquivo próprio em tests/.tmp, nunca o de
 * desenvolvimento e muito menos o de produção. As chaves aqui existem só
 * para os testes rodarem — não são segredos.
 */

const raiz = path.resolve(__dirname, '..')
const tmp = path.join(raiz, 'tests', '.tmp')

fs.mkdirSync(tmp, { recursive: true })

process.env.DATABASE_URL = `file:${path.join(tmp, 'teste.db')}`
process.env.JWT_SECRET = 'chave-de-teste-somente-com-mais-de-32-caracteres'
process.env.ENCRYPTION_KEY = 'dGVzdGUtZGUtY2hhdmUtY29tLTMyLWJ5dGVzLW9rIQ=='
process.env.APP_URL = 'http://localhost:3000'
process.env.UPLOADS_DIR = path.join(tmp, 'uploads')
