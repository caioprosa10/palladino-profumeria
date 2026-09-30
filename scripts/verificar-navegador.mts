/**
 * Verificação no navegador, headless.
 *
 * Captura, por página: screenshot, erros de console, requisições falhas e
 * violações de CSP. Em /admin, confere que o nonce do cabeçalho é o mesmo
 * que aparece nas tags <script> — se divergirem, o navegador bloqueia os
 * scripts e o painel não funciona, e isso não aparece em build nem em
 * typecheck.
 *
 * Uso:
 *   npx tsx scripts/verificar-navegador.mts <urlBase> [--admin-cookie <token>]
 */

import fs from 'fs'
import path from 'path'
import { chromium, type Browser, type Page } from '@playwright/test'

const SAIDA = path.resolve('capturas')

interface Achado {
  pagina: string
  status: number | null
  erros: string[]
  cspBloqueios: string[]
  requisicoesFalhas: string[]
  screenshot: string
}

/** Liga os ouvintes antes da navegação, senão eventos iniciais se perdem. */
function observar(page: Page) {
  const erros: string[] = []
  const cspBloqueios: string[] = []
  const requisicoesFalhas: string[] = []

  page.on('console', (msg) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return

    const texto = msg.text()
    // O Chrome reporta violação de CSP como erro de console.
    if (/Content Security Policy|Refused to (load|execute|apply)/i.test(texto)) {
      cspBloqueios.push(texto.slice(0, 300))
    } else if (msg.type() === 'error') {
      erros.push(texto.slice(0, 300))
    }
  })

  page.on('pageerror', (e) => erros.push(`[pageerror] ${e.message.slice(0, 300)}`))

  page.on('requestfailed', (req) => {
    const motivo = req.failure()?.errorText ?? 'desconhecido'
    requisicoesFalhas.push(`${req.method()} ${req.url().slice(0, 120)} — ${motivo}`)
  })

  return { erros, cspBloqueios, requisicoesFalhas }
}

async function visitar(browser: Browser, base: string, caminho: string, cookie?: string): Promise<Achado> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })

  if (cookie) {
    const u = new URL(base)
    await context.addCookies([
      { name: 'session', value: cookie, domain: u.hostname, path: '/', httpOnly: true, sameSite: 'Lax' },
    ])
  }

  const page = await context.newPage()
  const observado = observar(page)

  let status: number | null = null

  try {
    const r = await page.goto(base + caminho, { waitUntil: 'networkidle', timeout: 30000 })
    status = r?.status() ?? null
  } catch (e) {
    observado.erros.push(`[navegação] ${(e as Error).message.slice(0, 200)}`)
  }

  const nome = caminho === '/' ? 'home' : caminho.replace(/^\//, '').replace(/\//g, '-')
  const screenshot = path.join(SAIDA, `${nome}.png`)
  await page.screenshot({ path: screenshot, fullPage: true })

  await context.close()

  return { pagina: caminho, status, screenshot, ...observado }
}

/** O nonce do cabeçalho tem de ser o mesmo das tags <script>. */
async function conferirNonce(browser: Browser, base: string, cookie?: string) {
  const context = await browser.newContext()

  if (cookie) {
    const u = new URL(base)
    await context.addCookies([
      { name: 'session', value: cookie, domain: u.hostname, path: '/', httpOnly: true, sameSite: 'Lax' },
    ])
  }

  const page = await context.newPage()

  let cabecalho: string | null = null
  page.on('response', (r) => {
    if (r.url() === base + '/admin' && !cabecalho) {
      cabecalho = r.headers()['content-security-policy'] ?? null
    }
  })

  const observado = observar(page)
  const resp = await page.goto(base + '/admin', { waitUntil: 'networkidle', timeout: 30000 })

  const nonceCabecalho = (cabecalho ?? '').match(/nonce-([A-Za-z0-9+/=_-]+)/)?.[1] ?? null

  // `getAttribute('nonce')` devolve vazio de propósito: o navegador
  // esconde o atributo no DOM depois de aplicá-lo, para que um seletor CSS
  // não possa exfiltrá-lo. A propriedade `.nonce` continua legível — é ela
  // que diz se o script foi autorizado.
  const noncesNoHtml = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script')).map((s) => s.nonce || null)
  )

  const comNonce = noncesNoHtml.filter(Boolean)
  const semNonce = noncesNoHtml.filter((n) => !n).length

  await page.screenshot({ path: path.join(SAIDA, 'admin.png'), fullPage: true })
  await context.close()

  return {
    status: resp?.status() ?? null,
    nonceCabecalho,
    totalScripts: noncesNoHtml.length,
    scriptsComNonce: comNonce.length,
    scriptsSemNonce: semNonce,
    todosIguaisAoCabecalho: comNonce.length > 0 && comNonce.every((n) => n === nonceCabecalho),
    ...observado,
  }
}

async function main() {
  const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '')
  const i = process.argv.indexOf('--admin-cookie')
  const cookie = i > -1 ? process.argv[i + 1] : undefined

  fs.mkdirSync(SAIDA, { recursive: true })

  const browser = await chromium.launch()

  try {
    console.log(`\nVerificando ${base}\n`)

    for (const caminho of ['/login', '/cadastro', '/recuperar-senha', '/redefinir-senha?token=exemplo']) {
      const r = await visitar(browser, base, caminho)

      console.log(`${r.pagina}  HTTP ${r.status}`)
      console.log(`  erros de console:   ${r.erros.length}`)
      console.log(`  violações de CSP:   ${r.cspBloqueios.length}`)
      console.log(`  requisições falhas: ${r.requisicoesFalhas.length}`)
      console.log(`  screenshot:         ${path.relative(process.cwd(), r.screenshot)}`)

      for (const e of r.erros.slice(0, 3)) console.log(`    ! ${e}`)
      for (const c of r.cspBloqueios.slice(0, 3)) console.log(`    CSP: ${c}`)
      for (const f of r.requisicoesFalhas.slice(0, 3)) console.log(`    req: ${f}`)
      console.log('')
    }

    if (cookie) {
      const a = await conferirNonce(browser, base, cookie)

      console.log(`/admin  HTTP ${a.status}`)
      console.log(`  nonce no cabeçalho:      ${a.nonceCabecalho ? a.nonceCabecalho.slice(0, 12) + '…' : 'AUSENTE'}`)
      console.log(`  scripts no HTML:         ${a.totalScripts}`)
      console.log(`  com atributo nonce:      ${a.scriptsComNonce}`)
      console.log(`  sem atributo nonce:      ${a.scriptsSemNonce}`)
      console.log(`  todos batem com o cab.:  ${a.todosIguaisAoCabecalho ? 'sim' : 'NÃO'}`)
      console.log(`  erros de console:        ${a.erros.length}`)
      console.log(`  violações de CSP:        ${a.cspBloqueios.length}`)

      for (const e of a.erros.slice(0, 5)) console.log(`    ! ${e}`)
      for (const c of a.cspBloqueios.slice(0, 5)) console.log(`    CSP: ${c}`)

      if (!a.todosIguaisAoCabecalho) {
        console.error('\n❌ O nonce do HTML não corresponde ao do cabeçalho: os scripts seriam bloqueados.')
        process.exitCode = 1
      }
    } else {
      console.log('/admin  ignorado (sem --admin-cookie)')
    }
  } finally {
    await browser.close()
  }
}

main()
