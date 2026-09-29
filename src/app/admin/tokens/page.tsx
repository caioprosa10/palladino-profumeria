"use client"

import { useState, useEffect } from 'react'

interface Token {
  id: string;
  titulo: string;
  /** Só as pontas. O token completo não sai do servidor. */
  tokenMascarado: string;
  createdAt: string;
}

export default function AdminTokens() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingToken, setEditingToken] = useState<Token | null>(null)
  
  const [formData, setFormData] = useState({ titulo: '', token: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchTokens()
  }, [])

  const fetchTokens = async () => {
    try {
      const res = await fetch('/api/admin/tokens')
      if (res.ok) {
        const data = await res.json()
        setTokens(data)
      }
    } catch (error) {
      console.error('Erro ao buscar tokens:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (token?: Token) => {
    if (token) {
      setEditingToken(token)
      // O token em claro não vem do servidor. Em branco significa
      // "manter o atual"; preencher substitui.
      setFormData({ titulo: token.titulo, token: '' })
    } else {
      setEditingToken(null)
      setFormData({ titulo: '', token: '' })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingToken(null)
    setFormData({ titulo: '', token: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (editingToken) {
        await fetch(`/api/admin/tokens/${editingToken.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
      } else {
        await fetch('/api/admin/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
      }
      await fetchTokens()
      handleCloseModal()
    } catch (error) {
      console.error('Erro ao salvar token:', error)
      alert('Erro ao salvar token')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este token?')) return
    try {
      await fetch(`/api/admin/tokens/${id}`, { method: 'DELETE' })
      await fetchTokens()
    } catch (error) {
      console.error('Erro ao excluir:', error)
      alert('Erro ao excluir token')
    }
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('pt-BR')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)' }}>Gestão de Tokens</h1>
        <button 
          onClick={() => handleOpenModal()}
          style={{ backgroundColor: '#0f172a', color: '#fff', padding: '10px 20px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          + Novo Token
        </button>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Carregando...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Título</th>
                <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Token (Resumo)</th>
                <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Data de Cadastro</th>
                <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '15px', fontSize: '0.9rem', fontWeight: 500 }}>{t.titulo}</td>
                  <td style={{ padding: '15px', fontSize: '0.9rem', color: '#64748b' }}>
                    {t.tokenMascarado}
                  </td>
                  <td style={{ padding: '15px', fontSize: '0.9rem' }}>{formatDate(t.createdAt)}</td>
                  <td style={{ padding: '15px', fontSize: '0.9rem', textAlign: 'right', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => handleOpenModal(t)}
                      style={{ color: '#0ea5e9', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(t.id)}
                      style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
              {tokens.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Nenhum token cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '20px', fontSize: '1.5rem', fontFamily: 'var(--font-serif)' }}>
              {editingToken ? 'Editar Token' : 'Novo Token'}
            </h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Título de Identificação</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Mercado Pago, Melhor Envio..."
                  value={formData.titulo}
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Token / Chave API</label>
                <textarea
                  required={!editingToken}
                  placeholder={editingToken ? "Deixe em branco para manter o token atual" : "Cole o token aqui"}
                  rows={4}
                  value={formData.token}
                  onChange={(e) => setFormData({...formData, token: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  style={{ padding: '10px 15px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', fontWeight: 500 }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{ padding: '10px 15px', borderRadius: '4px', border: 'none', backgroundColor: '#0f172a', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? 'Salvando...' : 'Salvar Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
