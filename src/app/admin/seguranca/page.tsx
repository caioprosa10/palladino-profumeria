"use client"

import { useEffect, useState } from 'react'

interface Inicio {
  qr: string
  segredo: string
  codigosBackup: string[]
}

export default function AdminSeguranca() {
  const [ativo, setAtivo] = useState(false)
  const [restantes, setRestantes] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [inicio, setInicio] = useState<Inicio | null>(null)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [emailStatus, setEmailStatus] = useState('')
  const [testandoEmail, setTestandoEmail] = useState(false)

  const buscarStatus = async () => {
    try {
      const res = await fetch('/api/admin/2fa')
      if (res.ok) {
        const d = await res.json()
        setAtivo(d.ativo)
        setRestantes(d.codigosRestantes)
      }
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { buscarStatus() }, [])

  const chamar = async (acao: string, comCodigo = false) => {
    setErro(''); setAviso(''); setEnviando(true)
    try {
      const res = await fetch('/api/admin/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao, codigo: comCodigo ? codigo : undefined }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Erro na operação')

      if (acao === 'iniciar') {
        setInicio(d)
      } else {
        setInicio(null)
        setCodigo('')
        setAviso(acao === 'confirmar' ? 'Segundo fator ativado.' : 'Segundo fator desativado.')
        await buscarStatus()
      }
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro na operação')
    } finally {
      setEnviando(false)
    }
  }

  const enviarEmailTeste = async () => {
    setEmailStatus(''); setTestandoEmail(true)
    try {
      const res = await fetch('/api/admin/email-teste', { method: 'POST' })
      const d = await res.json()
      setEmailStatus(
        res.ok
          ? `Enviado para ${d.para}. Confira a caixa de entrada e o spam.`
          : `${d.error}${d.detalhe ? ` (${d.detalhe})` : ''}`
      )
    } catch {
      setEmailStatus('Falha de rede ao chamar o servidor.')
    } finally {
      setTestandoEmail(false)
    }
  }

  const caixa: React.CSSProperties = {
    backgroundColor: '#fff', padding: '30px', borderRadius: '8px',
    border: '1px solid #e2e8f0', maxWidth: '620px',
  }

  const campo: React.CSSProperties = {
    padding: '12px', borderRadius: '4px', border: '1px solid #cbd5e1',
    fontSize: '1rem', letterSpacing: '0.15em', width: '180px',
  }

  if (carregando) return <p style={{ padding: '20px' }}>Carregando...</p>

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)', marginBottom: '8px' }}>Segurança</h1>
      <p style={{ color: '#64748b', marginBottom: '25px', fontSize: '0.9rem' }}>
        Verificação em duas etapas da sua conta de administrador.
      </p>

      {erro && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', marginBottom: '20px', maxWidth: '620px' }}>{erro}</div>}
      {aviso && <div style={{ padding: '12px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '4px', marginBottom: '20px', maxWidth: '620px' }}>{aviso}</div>}

      <div style={caixa}>
        <p style={{ marginBottom: '20px' }}>
          Situação: <strong style={{ color: ativo ? '#15803d' : '#b45309' }}>{ativo ? 'ativa' : 'inativa'}</strong>
          {ativo && <span style={{ color: '#64748b', fontSize: '0.9rem' }}> · {restantes} código(s) de recuperação restante(s)</span>}
        </p>

        {!ativo && !inicio && (
          <>
            <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '20px', lineHeight: 1.6 }}>
              Com a verificação em duas etapas, a senha sozinha deixa de dar acesso ao painel.
              Você vai precisar de um aplicativo autenticador — Google Authenticator, Authy ou 1Password.
            </p>
            <button onClick={() => chamar('iniciar')} disabled={enviando} className="btn btn-primary">
              {enviando ? 'Gerando...' : 'Configurar'}
            </button>
          </>
        )}

        {inicio && (
          <>
            <p style={{ fontSize: '0.9rem', marginBottom: '15px' }}>1. Escaneie o código no seu aplicativo:</p>
            <img src={inicio.qr} alt="QR code para o aplicativo autenticador" width={220} height={220} style={{ border: '1px solid #e2e8f0', borderRadius: '4px' }} />

            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '15px 0' }}>
              Ou digite esta chave manualmente:<br />
              <code style={{ fontSize: '0.95rem', letterSpacing: '0.1em', color: '#0f172a' }}>{inicio.segredo}</code>
            </p>

            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '15px', borderRadius: '4px', margin: '20px 0' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '10px' }}>
                2. Guarde os códigos de recuperação agora
              </p>
              <p style={{ fontSize: '0.8rem', color: '#78350f', marginBottom: '12px' }}>
                Eles só aparecem esta vez e servem para entrar se você perder o aparelho. Cada um vale uma única vez.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                {inicio.codigosBackup.map(c => <span key={c}>{c}</span>)}
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', marginBottom: '10px' }}>3. Confirme com o código atual do aplicativo:</p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="000000" style={campo} autoComplete="one-time-code" />
              <button onClick={() => chamar('confirmar', true)} disabled={enviando || !codigo} className="btn btn-primary">
                {enviando ? 'Verificando...' : 'Ativar'}
              </button>
            </div>
          </>
        )}

        {ativo && (
          <>
            <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '15px' }}>
              Para desativar, confirme com o código do aplicativo. Isso também encerra suas outras sessões.
            </p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="000000" style={campo} autoComplete="one-time-code" />
              <button onClick={() => chamar('desativar', true)} disabled={enviando || !codigo} className="btn btn-secondary">
                {enviando ? 'Verificando...' : 'Desativar'}
              </button>
            </div>
          </>
        )}
      </div>

      <div style={{ ...caixa, marginTop: '25px' }}>
        <h2 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-serif)', marginBottom: '10px' }}>E-mail</h2>
        <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '18px', lineHeight: 1.6 }}>
          Envia uma mensagem de teste para <strong>o endereço desta conta</strong>, para
          confirmar que o SMTP está funcionando sem precisar provocar um pedido real de
          redefinição de senha.
        </p>

        <button onClick={enviarEmailTeste} disabled={testandoEmail} className="btn btn-secondary">
          {testandoEmail ? 'Enviando...' : 'Enviar e-mail de teste'}
        </button>

        {emailStatus && (
          <p style={{ fontSize: '0.85rem', marginTop: '15px', color: '#334155', wordBreak: 'break-word' }}>
            {emailStatus}
          </p>
        )}
      </div>
    </div>
  )
}
