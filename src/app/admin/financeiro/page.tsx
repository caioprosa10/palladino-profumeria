import { FinanceiroService } from '@/services/financeiro.service'
import AdminFinanceiroClient from './AdminFinanceiroClient'

export default async function AdminFinanceiro() {
  const metricas = await FinanceiroService.getMetricas()
  const pedidos = metricas.pedidos

  const formatCurrency = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const formatDate = (date: Date) => new Date(date).toLocaleDateString('pt-BR')

  return (
    <AdminFinanceiroClient>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)' }}>Gestão Financeira</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>Receita Total (Bruta)</h3>
          <p style={{ fontSize: '2rem', fontWeight: 600, color: '#0f172a' }}>{formatCurrency(metricas.receitaBrutaGlobal)}</p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>Ticket Médio Geral</h3>
          <p style={{ fontSize: '2rem', fontWeight: 600, color: '#0f172a' }}>{formatCurrency(metricas.ticketMedio)}</p>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>Histórico de Lançamentos (Pedidos Pagos/Enviados/Entregues)</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Data</th>
              <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Pedido</th>
              <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Subtotal</th>
              <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Frete</th>
              <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '15px', fontSize: '0.9rem' }}>{formatDate(p.createdAt)}</td>
                <td style={{ padding: '15px', fontSize: '0.9rem', fontFamily: 'monospace' }}>#{p.id.slice(-6).toUpperCase()}</td>
                <td style={{ padding: '15px', fontSize: '0.9rem' }}>{formatCurrency(p.subtotal)}</td>
                <td style={{ padding: '15px', fontSize: '0.9rem' }}>{formatCurrency(p.frete)}</td>
                <td style={{ padding: '15px', fontSize: '0.9rem', fontWeight: 600, color: '#16a34a' }}>+ {formatCurrency(p.total)}</td>
              </tr>
            ))}
            {pedidos.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Nenhum lançamento financeiro.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminFinanceiroClient>
  )
}
