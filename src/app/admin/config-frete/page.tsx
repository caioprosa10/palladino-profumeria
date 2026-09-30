"use client"

import { useState, useEffect } from 'react'

export default function ConfigFretePage() {
  const [formData, setFormData] = useState({
    token: '',
    clientId: '',
    clientSecret: '',
    ambiente: 'production',
    cepOrigem: ''
  })
  
  const [masked, setMasked] = useState({ token: '', clientSecret: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'connected' | 'disconnected'>('idle')

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/config-frete')
      if (res.ok) {
        const data = await res.json()
        setFormData({
          token: '', 
          clientId: data.clientId || '',
          clientSecret: '',
          ambiente: data.ambiente || 'production',
          cepOrigem: data.cepOrigem || ''
        })
        setMasked({
          token: data.tokenMasked || '',
          clientSecret: data.clientSecretMasked || ''
        })
      }
    } catch (error) {
      console.error('Erro ao buscar configuração', error)
    } finally {
      setLoading(false)
    }
  }

  // Busca ao montar. Resolver sem efeito exigiria mover a carga para um
  // Server Component e passar os dados por prop — refatoração de
  // arquitetura, não ajuste local. Desativado aqui de propósito, para a
  // regra continuar valendo no resto do projeto.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConfig()
  }, [])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/admin/config-frete', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        alert('Configurações salvas com sucesso!')
        fetchConfig()
      } else {
        alert('Erro ao salvar configuração.')
      }
    } catch (error) {
      alert('Erro de conexão.')
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/admin/config-frete/test')
      const data = await res.json()
      setStatus(data.connected ? 'connected' : 'disconnected')
    } catch (error) {
      setStatus('disconnected')
    } finally {
      setTesting(false)
    }
  }

  if (loading) return <div>Carregando configurações...</div>

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2>Configuração de Frete (Melhor Envio)</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {status !== 'idle' && (
            <span style={{ fontWeight: 'bold', color: status === 'connected' ? '#10b981' : '#ef4444' }}>
              {status === 'connected' ? '🟢 Conectado' : '🔴 Desconectado'}
            </span>
          )}
          <button 
            type="button"
            onClick={handleTestConnection} 
            disabled={testing}
            style={{ padding: '8px 16px', background: '#e2e8f0', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {testing ? 'Testando...' : 'Testar conexão'}
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Ambiente</label>
            <select 
              value={formData.ambiente}
              onChange={e => setFormData({...formData, ambiente: e.target.value})}
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', background: 'white' }}
            >
              <option value="production">Produção (Real)</option>
              <option value="sandbox">Sandbox (Testes)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>CEP de Origem (Estoque)</label>
            <input 
              type="text" 
              required 
              maxLength={8}
              placeholder="Somente números (ex: 01001000)"
              value={formData.cepOrigem}
              onChange={e => setFormData({...formData, cepOrigem: e.target.value.replace(/\D/g, '')})}
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Token de Acesso (Bearer)</label>
          <textarea 
            placeholder={masked.token ? `Atual: ${masked.token} (Preencha apenas se quiser alterar)` : 'Cole o token longo aqui...'}
            value={formData.token}
            onChange={e => setFormData({...formData, token: e.target.value})}
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '80px', fontFamily: 'monospace' }}
          />
          <small style={{ color: '#666' }}>O token será armazenado de forma segura. O sistema tentará usar também o arquivo .env se este campo estiver vazio.</small>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Client ID</label>
            <input 
              type="text" 
              placeholder="Opcional"
              value={formData.clientId}
              onChange={e => setFormData({...formData, clientId: e.target.value})}
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Client Secret</label>
            <input 
              type="password" 
              placeholder={masked.clientSecret ? `Atual: ${masked.clientSecret} (Preencha para alterar)` : 'Opcional'}
              value={formData.clientSecret}
              onChange={e => setFormData({...formData, clientSecret: e.target.value})}
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button type="submit" disabled={saving} style={{ padding: '12px 24px', background: 'var(--color-text-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>
    </div>
  )
}
