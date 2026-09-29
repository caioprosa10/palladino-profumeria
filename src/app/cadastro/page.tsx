"use client"

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
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
        body: JSON.stringify({ nome, email, telefone, cpf, senha, website })
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
    <div style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', marginBottom: '10px' }}>Criar Conta</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Junte-se à Palladino Profumeria e acesse benefícios exclusivos.</p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleCadastro} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Isca para robôs. Escondido da tela e dos leitores de tela, e
            fora da ordem de tabulação, para não atrapalhar quem usa o site. */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
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
          <label style={{ display: 'block', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 500 }}>Nome Completo *</label>
          <input 
            type="text" 
            value={nome}
            onChange={e => setNome(e.target.value)}
            required
            style={{ width: '100%', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '1rem', outline: 'none' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 500 }}>E-mail *</label>
          <input 
            type="email" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '1rem', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 500 }}>Telefone</label>
            <input 
              type="tel" 
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              style={{ width: '100%', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '1rem', outline: 'none' }}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 500 }}>CPF</label>
            <input 
              type="text" 
              value={cpf}
              onChange={e => setCpf(e.target.value)}
              style={{ width: '100%', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '1rem', outline: 'none' }}
              placeholder="000.000.000-00"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 500 }}>Senha *</label>
            <input 
              type="password" 
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              minLength={6}
              style={{ width: '100%', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '1rem', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 500 }}>Confirmar Senha *</label>
            <input 
              type="password" 
              value={confirmaSenha}
              onChange={e => setConfirmaSenha(e.target.value)}
              required
              minLength={6}
              style={{ width: '100%', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '1rem', outline: 'none' }}
            />
          </div>
        </div>

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
          {loading ? 'Criando Conta...' : 'Cadastrar'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
        Já tem uma conta?{' '}
        <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} style={{ color: 'var(--color-text)', fontWeight: 600, textDecoration: 'underline' }}>
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
      <div className="sub-page" style={{ padding: '120px 5%', minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
        <Suspense fallback={<div style={{ textAlign: 'center', width: '100%' }}>Carregando...</div>}>
          <CadastroContent />
        </Suspense>
      </div>
    </>
  )
}
