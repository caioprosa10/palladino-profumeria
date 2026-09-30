import { validarAmbiente, VARIAVEIS_DE_BUILD } from './lib/ambiente'

/**
 * Executado uma vez, antes de o servidor aceitar requisições.
 *
 * É o único lugar onde uma configuração inválida pode interromper a
 * subida de forma previsível — dentro de uma rota, o erro apareceria
 * como falha intermitente para quem estivesse usando o site.
 */
export function register() {
  validarAmbiente()

  const naoDefinidasNoBuild = VARIAVEIS_DE_BUILD.filter((v) => !process.env[v])

  if (naoDefinidasNoBuild.length > 0 && process.env.NODE_ENV === 'production') {
    console.warn(
      `⚠️  Lidas pelo next.config.ts durante o BUILD, e ausentes: ` +
        `${naoDefinidasNoBuild.join(', ')}. ` +
        `Definir apenas em tempo de execução não altera os cabeçalhos já gerados.`
    )
  }
}
