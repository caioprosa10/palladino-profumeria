import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

export default defineConfig({
  test: {
    // Node: o que testamos aqui é lógica de servidor (cripto, sessão,
    // validação, 2FA), não componentes de interface.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Carrega .env.test, para nunca tocar no banco de desenvolvimento.
    setupFiles: ['tests/setup.ts'],
    // Muitos testes compartilham o mesmo arquivo SQLite; rodar em paralelo
    // causaria disputa de escrita.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'scripts/**'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src') },
  },
})
