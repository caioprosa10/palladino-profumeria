"use client"

import { useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Turnstile } from '@/components/seguranca/Turnstile'
import Link from 'next/link'

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captcha, setCaptcha] = useState('')
  const siteKey = process.env.TURNSTILE_SITE_KEY_PUBLICA || null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMensagem('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, turnstileToken: captcha || undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar solicitação')
      }

      setMensagem(data.message)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="sub-page" style={{ padding: '120px 8%', minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--color-bg-alt)' }}>
        <div style={{ backgroundColor: '#fff', padding: '50px', width: '100%', maxWidth: '450px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', textAlign: 'center', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recuperar Senha</h2>
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: '30px', fontSize: '0.85rem' }}>Informe seu e-mail para receber as instruções</p>

          {error && <div style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#b91c1c', marginBottom: '20px', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}
          {mensagem && <div style={{ padding: '10px', backgroundColor: '#dcfce7', color: '#15803d', marginBottom: '20px', fontSize: '0.85rem', textAlign: 'center' }}>{mensagem}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <input 
              type="email" 
              placeholder="E-mail" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ padding: '15px', border: '1px solid rgba(0,0,0,0.1)', outline: 'none', backgroundColor: 'transparent' }} 
            />
        <Turnstile siteKey={siteKey} onToken={setCaptcha} />

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Enviando...' : 'Enviar Instruções'}
            </button>
          </form>

          <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Lembrou da senha? <Link href="/login" style={{ color: 'var(--color-gold-dark)', textDecoration: 'none', fontWeight: 500 }}>Fazer login</Link>
          </div>
        </div>
      </div>
    </>
  )
}
