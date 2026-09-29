"use client"

import { useEffect, useRef, useState } from 'react'

/**
 * Widget do Cloudflare Turnstile.
 *
 * Não renderiza nada quando `siteKey` é nulo — é assim que a integração
 * fica desligada sem a variável de ambiente, sem carregar script de
 * terceiro nem alterar o formulário.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      remove: (id: string) => void
      reset: (id?: string) => void
    }
  }
}

const URL_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

let carregando: Promise<void> | null = null

function carregarScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()

  // Um único carregamento, mesmo com vários widgets na página.
  carregando ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = URL_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Falha ao carregar o Turnstile'))
    document.head.appendChild(script)
  })

  return carregando
}

interface Props {
  siteKey: string | null
  /** Recebe o token a enviar ao servidor, ou '' quando expira. */
  onToken: (token: string) => void
}

export function Turnstile({ siteKey, onToken }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (!siteKey || !container.current) return

    let widgetId: string | null = null
    let ativo = true

    carregarScript()
      .then(() => {
        if (!ativo || !container.current || !window.turnstile) return

        widgetId = window.turnstile.render(container.current, {
          sitekey: siteKey,
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(''),
          'error-callback': () => {
            onToken('')
            setErro(true)
          },
          theme: 'light',
        })
      })
      .catch(() => setErro(true))

    return () => {
      ativo = false
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId)
        } catch {
          // Widget já removido junto do nó.
        }
      }
    }
    // onToken vem do componente pai a cada render; reagir a ele
    // recriaria o widget sem necessidade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey])

  if (!siteKey) return null

  return (
    <div>
      <div ref={container} />
      {erro && (
        <p style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '8px' }}>
          Não foi possível carregar a verificação de segurança. Recarregue a página.
        </p>
      )}
    </div>
  )
}
