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
    <div style={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', marginBottom: '10px' }}>Acesse sua Conta</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Acompanhe seus pedidos e tenha uma experiência premium.</p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 500 }}>E-mail</label>
          <input 
            type="email" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '1rem', outline: 'none' }}
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 500 }}>Senha</label>
          <input 
            type="password" 
            value={senha}
            onChange={e => setSenha(e.target.value)}
            required
            style={{ width: '100%', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '1rem', outline: 'none' }}
            placeholder="Sua senha secreta"
          />
          <div style={{ textAlign: 'right', marginTop: '8px' }}>
            <Link href="/recuperar-senha" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textDecoration: 'underline' }}>
              Esqueceu a senha?
            </Link>
          </div>
        </div>

        {pedeCaptcha && siteKey && (
          <Turnstile siteKey={siteKey} onToken={setCaptcha} />
        )}

        {pede2FA && (
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 500 }}>
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
              style={{ width: '100%', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '1rem', outline: 'none', letterSpacing: '0.15em' }}
              placeholder="000000"
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
              Use o código do seu aplicativo autenticador, ou um dos códigos de recuperação.
            </p>
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          style={{
            padding: '16px',
            backgroundColor: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            marginTop: '10px'
          }}
        >
          {loading ? 'Autenticando...' : 'Entrar'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
        Não possui uma conta?{' '}
        <Link href={`/cadastro?callbackUrl=${encodeURIComponent(callbackUrl)}`} style={{ color: 'var(--color-text)', fontWeight: 600, textDecoration: 'underline' }}>
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
      <div className="sub-page" style={{ padding: '120px 5%', minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
        <Suspense fallback={<div style={{ textAlign: 'center', width: '100%' }}>Carregando...</div>}>
          <LoginContent />
        </Suspense>
      </div>
    </>
  )
}
