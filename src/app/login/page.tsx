"use client"

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Turnstile } from '@/components/seguranca/Turnstile'
import { Navbar } from '@/components/layout/Navbar'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/cliente'

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [codigo, setCodigo] = useState('')
  // Só aparece depois de o servidor informar que a conta tem 2FA ativo.
  const [pede2FA, setPede2FA] = useState(false)
  const [captcha, setCaptcha] = useState('')
  // Ligado pelo servidor após algumas tentativas do mesmo IP.
  const [pedeCaptcha, setPedeCaptcha] = useState(false)
  const siteKey = process.env.TURNSTILE_SITE_KEY_PUBLICA || null
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha, codigo: codigo || undefined, turnstileToken: captcha || undefined })
      })

      const data = await res.json()

      if (!res.ok) {
        // A senha estava certa, falta o segundo fator.
        if (data.requer2FA) {
          setPede2FA(true)
        }
        if (data.requerCaptcha) {
          setPedeCaptcha(true)
        }
        throw new Error(data.error || 'Erro ao realizar login')
      }

      // Redireciona de volta para onde estava ou para o painel
      router.push(callbackUrl)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-head">
        <h1 className="auth-title">Acesse sua Conta</h1>
        <p className="auth-sub">Acompanhe seus pedidos e tenha uma experiência premium.</p>
      </div>

      {error && (
        <div className="auth-alert auth-alert-erro">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="auth-form">
        <div>
          <label className="auth-label">E-mail</label>
          <input 
            type="email" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="auth-input"
            placeholder="seu@email.com"
 />
        </div>

        <div>
          <label className="auth-label">Senha</label>
          <input 
            type="password" 
            value={senha}
            onChange={e => setSenha(e.target.value)}
            required
            className="auth-input"
            placeholder="Sua senha secreta"
 />
          <div className="auth-link-linha">
            <Link href="/recuperar-senha" className="auth-link">
              Esqueceu a senha?
            </Link>
          </div>
        </div>

        {pedeCaptcha && siteKey && (
          <Turnstile siteKey={siteKey} onToken={setCaptcha} />
        )}

        {pede2FA && (
          <div>
            <label className="auth-label">
              Código de verificação
            </label>
            <input
              type="text"
              inputMode="text"
              autoComplete="one-time-code"
              autoFocus
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              required
              className="auth-input auth-input-codigo"
              placeholder="000000"
 />
            <p className="auth-dica">
              Use o código do seu aplicativo autenticador, ou um dos códigos de recuperação.
            </p>
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="auth-submit" style={{ opacity: loading ? 0.7 : 1 }}
 >
          {loading ? 'Autenticando...' : 'Entrar'}
        </button>
      </form>

      <div className="auth-troca">
        Não possui uma conta?{' '}
        <Link href={`/cadastro?callbackUrl=${encodeURIComponent(callbackUrl)}`} >
          Crie a sua agora
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <div className="sub-page auth-pagina">
        <Suspense fallback={<div className="auth-centro">Carregando...</div>}>
          <LoginContent />
        </Suspense>
      </div>
    </>
  )
}
