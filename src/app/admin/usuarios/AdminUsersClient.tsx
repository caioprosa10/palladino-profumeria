"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminUsersClient({ initialUsers }: { initialUsers: any[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    role: 'ADMIN',
    ativo: true
  })

  const handleOpenModal = (user?: any) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        nome: user.nome,
        email: user.email,
        senha: '', // Don't show existing password
        role: user.role,
        ativo: user.ativo
      })
    } else {
      setEditingUser(null)
      setFormData({
        nome: '',
        email: '',
        senha: '',
        role: 'ADMIN',
        ativo: true
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingUser(null)
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/usuarios')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
        router.refresh()
      }
    } catch (error) {
      console.error('Erro ao atualizar lista', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const url = editingUser ? `/api/admin/usuarios/${editingUser.id}` : '/api/admin/usuarios'
      const method = editingUser ? 'PUT' : 'POST'
      
      const payload: any = { ...formData }
      if (editingUser && !payload.senha) {
        delete payload.senha
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Erro ao salvar usuário')
      } else {
        await fetchUsers()
        handleCloseModal()
      }
    } catch (error) {
      console.error(error)
      alert('Erro inesperado')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, role: string) => {
    if (role === 'SUPERADMIN' && users.filter(u => u.role === 'SUPERADMIN').length === 1) {
      alert('Você não pode excluir o último Super Administrador do sistema.')
      return
    }

    if (!confirm('ATENÇÃO: Deseja realmente excluir permanentemente este administrador?')) return
    
    try {
      const res = await fetch(`/api/admin/usuarios/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Erro ao excluir')
      } else {
        await fetchUsers()
      }
    } catch (error) {
      console.error(error)
      alert('Erro ao excluir')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)' }}>Gestão de Administradores</h1>
        <button 
          onClick={() => handleOpenModal()}
          style={{ padding: '10px 20px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
        >
          + Novo Admin
        </button>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Nome</th>
              <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>E-mail</th>
              <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Função</th>
              <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Status</th>
              <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '15px', fontSize: '0.9rem', fontWeight: 500 }}>{u.nome}</td>
                <td style={{ padding: '15px', fontSize: '0.9rem' }}>{u.email}</td>
                <td style={{ padding: '15px', fontSize: '0.9rem' }}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                    backgroundColor: u.role === 'SUPERADMIN' ? '#6366f1' : '#0ea5e9',
                    color: '#fff'
                  }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '15px', fontSize: '0.9rem' }}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
                    backgroundColor: u.ativo ? '#dcfce7' : '#fee2e2',
                    color: u.ativo ? '#166534' : '#991b1b'
                  }}>
                    {u.ativo ? 'Ativo' : 'Bloqueado'}
                  </span>
                </td>
                <td style={{ padding: '15px', fontSize: '0.9rem', textAlign: 'right', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => handleOpenModal(u)}
                    style={{ color: '#0ea5e9', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(u.id, u.role)}
                    style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal CRUD */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '20px', fontSize: '1.5rem', fontFamily: 'var(--font-serif)' }}>
              {editingUser ? 'Editar Administrador' : 'Novo Administrador'}
            </h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Nome Completo</label>
                <input 
                  type="text" 
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>E-mail</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                  {editingUser ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha de Acesso'}
                </label>
                <input 
                  type="password" 
                  required={!editingUser}
                  minLength={6}
                  value={formData.senha}
                  onChange={(e) => setFormData({...formData, senha: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Nível de Acesso (Role)</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="ADMIN">Administrador Padrão</option>
                    <option value="SUPERADMIN">Super Administrador</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Status da Conta</label>
                  <select 
                    value={formData.ativo ? 'true' : 'false'}
                    onChange={(e) => setFormData({...formData, ativo: e.target.value === 'true'})}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="true">Ativo (Permitido)</option>
                    <option value="false">Bloqueado (Suspenso)</option>
                  </select>
                </div>
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
                  {submitting ? 'Salvando...' : 'Salvar Administrador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
