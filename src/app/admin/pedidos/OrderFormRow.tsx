'use client'

import { useState } from 'react'
import { updateOrderAction, deleteOrderAction } from './actions'

export default function OrderFormRow({ pedido }: { pedido: any }) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [status, setStatus] = useState(pedido.status)
  const [rastreamento, setRastreamento] = useState(pedido.shipping?.rastreamento || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await updateOrderAction(pedido.id, status, rastreamento, pedido.shipping?.transportadora || '')
      if (res.success) {
        alert('Pedido atualizado com sucesso!')
      } else {
        alert(res.message || 'Erro ao atualizar pedido.')
      }
    } catch (err) {
      alert('Erro de conexão ao atualizar pedido.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    const confirmDelete = window.confirm('Tem certeza que deseja excluir este pedido? Essa ação não poderá ser desfeita.')
    if (!confirmDelete) return

    setDeleting(true)
    try {
      const res = await deleteOrderAction(pedido.id)
      if (res.success) {
        alert('Pedido excluído com sucesso!')
      } else {
        alert(res.message || 'Erro ao excluir pedido.')
      }
    } catch (err) {
      alert('Erro de conexão ao excluir pedido.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        <select 
          value={status} 
          onChange={(e) => setStatus(e.target.value)}
          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.8rem', width: '100%' }}
        >
          <option value="aguardando_pagamento">Aguardando Pagamento</option>
          <option value="pago">Pago (Separar)</option>
          <option value="em_preparacao">Em Preparação</option>
          <option value="enviado">Enviado</option>
          <option value="entregue">Entregue</option>
          <option value="cancelado">Cancelado</option>
        </select>

        <input 
          type="text" 
          value={rastreamento} 
          onChange={(e) => setRastreamento(e.target.value)}
          placeholder="Rastreamento" 
          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.8rem', width: '100%' }}
        />

        <button 
          type="submit" 
          disabled={loading || deleting}
          style={{ 
            padding: '6px', 
            backgroundColor: loading ? '#9ca3af' : '#111', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px', 
            fontSize: '0.75rem', 
            cursor: (loading || deleting) ? 'wait' : 'pointer', 
            fontWeight: 600, 
            textTransform: 'uppercase',
            width: '100%',
            marginTop: '2px'
          }}
        >
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </form>
      
      <button 
        type="button" 
        onClick={handleDelete}
        disabled={loading || deleting}
        style={{ 
          padding: '6px', 
          backgroundColor: deleting ? '#fca5a5' : '#ef4444', 
          color: '#fff', 
          border: 'none', 
          borderRadius: '4px', 
          fontSize: '0.75rem', 
          cursor: (loading || deleting) ? 'wait' : 'pointer', 
          fontWeight: 600, 
          textTransform: 'uppercase',
          width: '100%',
          transition: 'background-color 0.2s'
        }}
      >
        {deleting ? 'Excluindo...' : 'Excluir Pedido'}
      </button>
    </div>
  )
}
