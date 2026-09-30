import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

/**
 * Ambiente de teste isolado.
 *
 * O banco é um arquivo próprio em tests/.tmp, nunca o de desenvolvimento
 * e muito menos o de produção.
 *
 * As chaves são geradas a cada execução, não escritas aqui. Valor de alta
 * entropia em arquivo versionado é indistinguível de credencial real para
 * um scanner de segredos — e o gitleaks apontou a versão anterior deste
 * arquivo, com razão. Gerar resolve os dois lados: nada para o scanner
 * achar, e cada execução usa um valor descartável.
 */

const raiz = path.resolve(__dirname, '..')
const tmp = path.join(raiz, 'tests', '.tmp')

fs.mkdirSync(tmp, { recursive: true })

process.env.DATABASE_URL = `file:${path.join(tmp, 'teste.db')}`
process.env.JWT_SECRET = crypto.randomBytes(48).toString('base64')
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
process.env.APP_URL = 'http://localhost:3000'
process.env.UPLOADS_DIR = path.join(tmp, 'uploads')
