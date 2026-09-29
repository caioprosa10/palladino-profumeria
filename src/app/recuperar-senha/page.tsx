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
      <div className="sub-page auth-card-pagina">
        <div className="auth-card">
          <h2 className="auth-title">Recuperar Senha</h2>
          <p className="auth-sub">Informe seu e-mail para receber as instruções</p>

          {error && <div className="auth-alert auth-alert-erro">{error}</div>}
          {mensagem && <div className="auth-alert auth-alert-ok">{mensagem}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <input 
              type="email" 
              placeholder="E-mail" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="auth-input" 
 />
        <Turnstile siteKey={siteKey} onToken={setCaptcha} />

            <button type="submit" className="btn btn-primary auth-botao" style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Enviando...' : 'Enviar Instruções'}
            </button>
          </form>

          <div className="auth-rodape">
            Lembrou da senha? <Link href="/login" >Fazer login</Link>
          </div>
        </div>
      </div>
    </>
  )
}
