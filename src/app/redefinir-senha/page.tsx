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

  return (
    <>
      <Navbar />
      <div className="sub-page auth-card-pagina">
        <div className="auth-card">
          <h2 className="auth-title">Nova Senha</h2>
          <p className="auth-sub">
            Mínimo de 10 caracteres, com letras e números
          </p>

          {error && <div className="auth-alert auth-alert-erro">{error}</div>}
          {mensagem && <div className="auth-alert auth-alert-ok">{mensagem}</div>}

          {!token ? (
            <p className="auth-aviso">
              Link incompleto. <Link href="/recuperar-senha" >Solicite um novo</Link>.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <input
                type="password"
                placeholder="Nova senha"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                minLength={10}
                autoComplete="new-password"
                className="auth-input"
 />
              <input
                type="password"
                placeholder="Repita a nova senha"
                value={confirmacao}
                onChange={e => setConfirmacao(e.target.value)}
                required
                minLength={10}
                autoComplete="new-password"
                className="auth-input"
 />
              <button type="submit" className="btn btn-primary auth-botao" style={{ opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          )}

          <div className="auth-rodape">
            <Link href="/login" >Voltar ao login</Link>
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
