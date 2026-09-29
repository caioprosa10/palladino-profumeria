"use client"

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Turnstile } from '@/components/seguranca/Turnstile'
import { Navbar } from '@/components/layout/Navbar'

function CadastroContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/cliente'

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  // Campo-isca contra robôs: fica invisível, então pessoa nenhuma o preenche.
  const [website, setWebsite] = useState('')
  const [captcha, setCaptcha] = useState('')
  const siteKey = process.env.TURNSTILE_SITE_KEY_PUBLICA || null
  const [confirmaSenha, setConfirmaSenha] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (senha !== confirmaSenha) {
      setError('As senhas não coincidem.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, telefone, cpf, senha, website, turnstileToken: captcha || undefined })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar conta')
      }

      // Conta criada. Opcionalmente já faz login automático aqui, 
      // ou redireciona pro login com mensagem
      
      // Vamos tentar fazer o login automático para melhorar a conversão
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      })

      if (loginRes.ok) {
        router.push(callbackUrl)
        router.refresh()
      } else {
        router.push('/login?cadastrado=true')
      }
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap-largo">
      <div className="auth-head">
        <h1 className="auth-title">Criar Conta</h1>
        <p className="auth-sub">Junte-se à Palladino Profumeria e acesse benefícios exclusivos.</p>
      </div>

      {error && (
        <div className="auth-alert auth-alert-erro">
          {error}
        </div>
      )}

      <form onSubmit={handleCadastro} className="auth-form">
        {/* Isca para robôs. Escondido da tela e dos leitores de tela, e
            fora da ordem de tabulação, para não atrapalhar quem usa o site. */}
        <div aria-hidden="true" className="auth-honeypot">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={e => setWebsite(e.target.value)}
 />
        </div>
        
        <div>
          <label className="auth-label">Nome Completo *</label>
          <input 
            type="text" 
            value={nome}
            onChange={e => setNome(e.target.value)}
            required
            className="auth-input"
 />
        </div>

        <div>
          <label className="auth-label">E-mail *</label>
          <input 
            type="email" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="auth-input"
 />
        </div>

        <div className="auth-par">
          <div>
            <label className="auth-label">Telefone</label>
            <input 
              type="tel" 
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              className="auth-input"
              placeholder="(00) 00000-0000"
 />
          </div>
          <div>
            <label className="auth-label">CPF</label>
            <input 
              type="text" 
              value={cpf}
              onChange={e => setCpf(e.target.value)}
              className="auth-input"
              placeholder="000.000.000-00"
 />
          </div>
        </div>

        <div className="auth-par">
          <div>
            <label className="auth-label">Senha *</label>
            <input 
              type="password" 
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              minLength={6}
              className="auth-input"
 />
          </div>
          <div>
            <label className="auth-label">Confirmar Senha *</label>
            <input 
              type="password" 
              value={confirmaSenha}
              onChange={e => setConfirmaSenha(e.target.value)}
              required
              minLength={6}
              className="auth-input"
 />
          </div>
        </div>

        <Turnstile siteKey={siteKey} onToken={setCaptcha} />

        <button 
          type="submit" 
          disabled={loading}
          className="auth-submit" style={{ opacity: loading ? 0.7 : 1 }}
 >
          {loading ? 'Criando Conta...' : 'Cadastrar'}
        </button>
      </form>

      <div className="auth-troca">
        Já tem uma conta?{' '}
        <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} >
          Faça login aqui
        </Link>
      </div>
    </div>
  )
}

export default function CadastroPage() {
  return (
    <>
      <Navbar />
      <div className="sub-page auth-pagina">
        <Suspense fallback={<div className="auth-centro">Carregando...</div>}>
          <CadastroContent />
        </Suspense>
      </div>
    </>
  )
}
