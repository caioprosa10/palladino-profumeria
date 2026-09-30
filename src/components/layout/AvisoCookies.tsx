"use client"

import { useCallback, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'

const CHAVE = 'palladino_cookies_v1'

/**
 * Aviso de cookies.
 *
 * O site usa apenas o cookie de sessão, que é necessário para ter conta e
 * finalizar compra — não há rastreamento nem publicidade. Por isso o aviso
 * informa e registra a ciência, em vez de pedir permissão para algo que
 * poderia ser desligado: recusar o cookie de sessão seria o mesmo que
 * desligar o login.
 *
 * A escolha fica no navegador de quem visita, não no servidor: guardá-la
 * no banco exigiria identificar a pessoa antes de ela consentir.
 */
export function AvisoCookies() {
  // Um contador só para avisar o React de que o valor externo mudou.
  const [versao, setVersao] = useState(0)

  const inscrever = useCallback(() => () => {}, [])

  /**
   * useSyncExternalStore é a API do React para ler estado que não é dele —
   * aqui, o localStorage. Um useEffect com setState funcionaria, mas
   * dispara um render a mais e a regra react-hooks/set-state-in-effect
   * existe justamente para apontar isso.
   */
  const jaCiente = useSyncExternalStore(
    inscrever,
    () => {
      void versao
      try {
        return Boolean(localStorage.getItem(CHAVE))
      } catch {
        // Armazenamento bloqueado: não insistir com o aviso.
        return true
      }
    },
    // No servidor não há localStorage. Assumir "já ciente" evita que o
    // aviso apareça no HTML e desapareça na hidratação.
    () => true
  )

  const aceitar = () => {
    try {
      localStorage.setItem(CHAVE, new Date().toISOString())
    } catch {
      // Sem onde guardar; apenas fecha nesta visita.
    }
    setVersao((v) => v + 1)
  }

  if (jaCiente) return null

  return (
    <div
      role="region"
      aria-label="Aviso sobre cookies"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        backgroundColor: 'var(--color-ink)',
        color: 'var(--color-bg)',
        padding: '18px 8%',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        boxShadow: '0 -4px 24px rgba(11, 27, 48, 0.18)',
      }}
    >
      <p style={{ fontSize: '0.85rem', lineHeight: 1.6, maxWidth: '640px', margin: 0 }}>
        Usamos apenas um cookie de sessão, necessário para manter você conectado
        e finalizar compras. Não usamos cookies de publicidade ou rastreamento.{' '}
        <Link href="/privacidade" style={{ color: 'var(--color-gold-bright)', textDecoration: 'underline' }}>
          Política de privacidade
        </Link>
        .
      </p>

      <button
        onClick={aceitar}
        style={{
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-ink)',
          border: 'none',
          padding: '12px 28px',
          fontSize: '0.72rem',
          fontWeight: 500,
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Entendi
      </button>
    </div>
  )
}
