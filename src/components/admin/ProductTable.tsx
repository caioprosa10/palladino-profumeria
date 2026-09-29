"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ProductTable({ produtos }: { produtos: any[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const formatCurrency = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  const toggleAtivo = async (id: string, currentStatus: boolean) => {
    setLoadingId(id)
    try {
      const formData = new FormData()
      formData.append('ativo', (!currentStatus).toString())
      // We need to fetch existing product data to update just 'ativo'.
      // The API currently requires all fields. Let's make an action just for this, or modify API.
      // Wait, a server action is better here.
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return
    
    setLoadingId(id)
    try {
      const res = await fetch(`/api/admin/produtos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao deletar')
      router.refresh()
    } catch (e) {
      alert('Erro ao excluir produto')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Produto</th>
            <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>SKU</th>
            <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Categoria</th>
            <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Preço</th>
            <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Estoque</th>
            <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Status</th>
            <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0', opacity: loadingId === p.id ? 0.5 : 1 }}>
              <td style={{ padding: '15px', fontSize: '0.9rem', fontWeight: 500 }}>{p.nome}</td>
              <td style={{ padding: '15px', fontSize: '0.9rem', fontFamily: 'monospace' }}>{p.sku}</td>
              <td style={{ padding: '15px', fontSize: '0.9rem' }}>{p.categoria?.nome}</td>
              <td style={{ padding: '15px', fontSize: '0.9rem', fontWeight: 500 }}>{formatCurrency(p.preco)}</td>
              <td style={{ padding: '15px', fontSize: '0.9rem' }}>
                <span style={{ color: p.estoque < 10 ? '#ef4444' : 'inherit', fontWeight: p.estoque < 10 ? 600 : 400 }}>
                  {p.estoque} un
                </span>
              </td>
              <td style={{ padding: '15px', fontSize: '0.9rem' }}>
                <span style={{ 
                  padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
                  backgroundColor: p.ativo ? '#dcfce7' : '#fee2e2',
                  color: p.ativo ? '#166534' : '#991b1b'
                }}>
                  {p.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td style={{ padding: '15px', fontSize: '0.9rem', display: 'flex', gap: '10px' }}>
                <Link href={`/admin/produtos/${p.id}/editar`} style={{ color: '#0ea5e9', textDecoration: 'none', fontWeight: 500 }}>
                  Editar
                </Link>
                <button onClick={() => handleDelete(p.id)} disabled={loadingId === p.id} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 500 }}>
                  Excluir
                </button>
              </td>
            </tr>
          ))}
          {produtos.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Nenhum produto encontrado.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
