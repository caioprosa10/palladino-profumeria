import crypto from 'crypto'
import os from 'os'
import path from 'path'

/**
 * Ambiente de teste isolado.
 *
 * O banco de testes é um Postgres próprio — `palladino_test` por padrão —,
 * nunca o de desenvolvimento e muito menos o de produção. Testar no mesmo
 * motor de banco que a produção usa é o ponto: a suíte rodava em SQLite
 * enquanto a produção iria para Postgres, e divergência de dialeto é
 * exatamente o tipo de erro que passa em teste e quebra no ar.
 *
 * As chaves são geradas a cada execução, não escritas aqui. Valor de alta
 * entropia em arquivo versionado é indistinguível de credencial real para
 * um scanner de segredos — e o gitleaks apontou a versão anterior deste
 * arquivo, com razão.
 */

// Permite sobrepor em CI, onde o usuário e o host do Postgres diferem.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? `postgresql://${os.userInfo().username}@localhost:5432/palladino_test`

process.env.JWT_SECRET = crypto.randomBytes(48).toString('base64')
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
process.env.APP_URL = 'http://localhost:3000'

// Mantido só para os testes que ainda escrevem arquivo temporário.
process.env.UPLOADS_DIR = path.join(os.tmpdir(), 'palladino-teste-uploads')
