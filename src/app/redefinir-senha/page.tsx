"use client"

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import Link from 'next/link'

function FormularioNovaSenha() {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''

  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMensagem('')

    if (senha !== confirmacao) {
      setError('As senhas não conferem')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, senha }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao redefinir senha')
      }

      setMensagem(data.message)
      setTimeout(() => router.push('/login'), 2500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const estiloCampo = {
    padding: '15px',
    border: '1px solid var(--hairline)',
    outline: 'none',
    backgroundColor: 'transparent',
  }

  return (
    <>
      <Navbar />
      <div className="sub-page" style={{ padding: '120px 8%', minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--color-bg-alt)' }}>
        <div style={{ backgroundColor: 'var(--color-surface)', padding: '50px', width: '100%', maxWidth: '450px', border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-soft)' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', textAlign: 'center', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Nova Senha</h2>
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: '30px', fontSize: '0.85rem' }}>
            Mínimo de 10 caracteres, com letras e números
          </p>

          {error && <div style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#b91c1c', marginBottom: '20px', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}
          {mensagem && <div style={{ padding: '10px', backgroundColor: '#dcfce7', color: '#15803d', marginBottom: '20px', fontSize: '0.85rem', textAlign: 'center' }}>{mensagem}</div>}

          {!token ? (
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              Link incompleto. <Link href="/recuperar-senha" style={{ color: 'var(--color-gold-dark)' }}>Solicite um novo</Link>.
            </p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <input
                type="password"
                placeholder="Nova senha"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                minLength={10}
                autoComplete="new-password"
                style={estiloCampo}
              />
              <input
                type="password"
                placeholder="Repita a nova senha"
                value={confirmacao}
                onChange={e => setConfirmacao(e.target.value)}
                required
                minLength={10}
                autoComplete="new-password"
                style={estiloCampo}
              />
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          )}

          <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            <Link href="/login" style={{ color: 'var(--color-gold-dark)', textDecoration: 'none', fontWeight: 500 }}>Voltar ao login</Link>
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * useSearchParams torna a árvore dinâmica. Sem um limite de Suspense o
 * build falha ao prerenderizar esta página, conforme a documentação do
 * Next recomenda para hooks que leem a URL.
 */
export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <FormularioNovaSenha />
    </Suspense>
  )
}
