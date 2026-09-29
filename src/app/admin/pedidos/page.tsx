import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import OrderFormRow from './OrderFormRow'
import Link from 'next/link'

function getStatusBadge(statusPedido: string, statusPagamento: string | null) {
  // Tradução do Status e Cores
  if (statusPedido === 'cancelado' || statusPagamento === 'cancelled' || statusPagamento === 'rejected' || statusPagamento === 'refunded') {
    return { text: 'Cancelado', bg: '#fef2f2', color: '#991b1b', border: '#fecaca' }
  }
  if (statusPedido === 'entregue') {
    return { text: 'Entregue', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' }
  }
  if (statusPedido === 'enviado') {
    return { text: 'Enviado', bg: '#f5f3ff', color: '#5b21b6', border: '#ddd6fe' }
  }
  if (statusPedido === 'em_preparacao') {
    return { text: 'Em Preparação', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' }
  }
  if (statusPagamento === 'approved' || statusPedido === 'pago') {
    return { text: 'Pago', bg: '#ecfccb', color: '#3f6212', border: '#d9f99d' }
  }
  
  return { text: 'Aguardando Pgto', bg: '#fefce8', color: '#854d0e', border: '#fef08a' }
}

export default async function AdminPedidosPage(props: { searchParams: Promise<{ status?: string }> }) {
  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value

  if (!sessionCookie) redirect('/login')

  const session = await decrypt(sessionCookie)
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) redirect('/')

  const statusFilter = searchParams.status
  let whereClause: any = {}

  if (statusFilter === 'PENDING') {
    whereClause = { OR: [{ status: 'aguardando_pagamento' }, { pagamentoObj: { status: 'pending' } }] }
  } else if (statusFilter === 'PAID') {
    whereClause = { status: 'pago', pagamentoObj: { status: 'approved' } }
  } else if (statusFilter === 'PREPARING') {
    whereClause = { status: 'em_preparacao', pagamentoObj: { status: 'approved' } }
  } else if (statusFilter === 'SHIPPED') {
    whereClause = { status: 'enviado', shipping: { rastreamento: { not: null } } }
  } else if (statusFilter === 'DELIVERED') {
    whereClause = { status: 'entregue' }
  } else if (statusFilter === 'CANCELED') {
    whereClause = { OR: [{ status: 'cancelado' }, { pagamentoObj: { status: { in: ['rejected', 'cancelled', 'refunded'] } } }] }
  }

  const pedidos = await prisma.pedido.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      usuario: { select: { nome: true, email: true, telefone: true } },
      pagamentoObj: true,
      shipping: true
    }
  })

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
  }

  const getLinkStyle = (isActive: boolean) => ({
    padding: '8px 15px', 
    borderRadius: '4px', 
    backgroundColor: isActive ? '#0f172a' : '#e2e8f0', 
    color: isActive ? '#fff' : '#0f172a', 
    textDecoration: 'none', 
    fontSize: '0.85rem', 
    fontWeight: 500,
    transition: 'all 0.2s ease-in-out'
  })

  return (
    <div style={{ padding: '40px 5%', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem' }}>Painel Administrativo: Pedidos</h1>
        </div>

        {/* Filtros */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link href="/admin/pedidos" style={getLinkStyle(!statusFilter)}>Todos</Link>
          <Link href="/admin/pedidos?status=PENDING" style={getLinkStyle(statusFilter === 'PENDING')}>Aguardando Pgto</Link>
          <Link href="/admin/pedidos?status=PAID" style={getLinkStyle(statusFilter === 'PAID')}>Pagos (Separar)</Link>
          <Link href="/admin/pedidos?status=PREPARING" style={getLinkStyle(statusFilter === 'PREPARING')}>Em Preparação</Link>
          <Link href="/admin/pedidos?status=SHIPPED" style={getLinkStyle(statusFilter === 'SHIPPED')}>Enviados</Link>
          <Link href="/admin/pedidos?status=DELIVERED" style={getLinkStyle(statusFilter === 'DELIVERED')}>Entregues</Link>
          <Link href="/admin/pedidos?status=CANCELED" style={getLinkStyle(statusFilter === 'CANCELED')}>Cancelados</Link>
        </div>

        {pedidos.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <svg style={{ margin: '0 auto 15px', width: '48px', height: '48px', color: '#94a3b8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 style={{ fontSize: '1.2rem', color: '#334155', marginBottom: '8px', fontWeight: 600 }}>Nenhum pedido encontrado nesta categoria.</h3>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f3f4f6', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                <tr>
                  <th style={{ padding: '15px 20px', borderBottom: '1px solid #e5e7eb' }}>ID / Data</th>
                  <th style={{ padding: '15px 20px', borderBottom: '1px solid #e5e7eb' }}>Cliente</th>
                  <th style={{ padding: '15px 20px', borderBottom: '1px solid #e5e7eb' }}>Total</th>
                  <th style={{ padding: '15px 20px', borderBottom: '1px solid #e5e7eb' }}>Status Pagamento</th>
                  <th style={{ padding: '15px 20px', borderBottom: '1px solid #e5e7eb' }}>Ação e Logística</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map(pedido => {
                  const badge = getStatusBadge(pedido.status, pedido.pagamentoObj?.status || null)
                  return (
                    <tr key={pedido.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '16px 12px', minWidth: '120px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>#{pedido.id.substring(0, 8).toUpperCase()}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{formatDate(pedido.createdAt)}</div>
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem', color: '#1e293b' }}>{pedido.usuario.nome}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{pedido.usuario.email}</div>
                        {pedido.usuario.telefone && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{pedido.usuario.telefone}</div>}
                      </td>
                      <td style={{ padding: '16px 12px', fontWeight: 600, fontSize: '0.9rem', color: '#0f172a', whiteSpace: 'nowrap' }}>
                        R$ {pedido.total.toFixed(2).replace('.', ',')}
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '4px 10px', 
                          borderRadius: '20px', 
                          fontSize: '0.7rem', 
                          fontWeight: 700, 
                          textTransform: 'uppercase',
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          whiteSpace: 'nowrap'
                        }}>
                          {badge.text}
                        </span>
                      </td>
                      <td style={{ padding: '16px 12px', width: '220px' }}>
                        <OrderFormRow pedido={pedido} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        
      </div>
    </div>
  )
}
