import { prisma } from '@/lib/prisma'
import { FinanceiroService } from '@/services/financeiro.service'

export default async function AdminDashboard() {
  const agora = new Date()
  
  // Data boundaries
  const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  const inicioSemana = new Date(inicioDia)
  inicioSemana.setDate(inicioDia.getDate() - inicioDia.getDay()) // Domingo como inicio
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const inicioAno = new Date(agora.getFullYear(), 0, 1)

  // Buscar métricas reais via FinanceiroService
  const metricas = await FinanceiroService.getMetricas()
  const statsOp = await FinanceiroService.getStatusOperacionais()

  // Contagens adicionais (Clientes e Estoque)
  const numClientes = await prisma.user.count({ where: { role: 'CUSTOMER' } })
  
  const produtosBaixoEstoque = await prisma.produto.findMany({
    where: { estoque: { lt: 10 } },
    select: { nome: true, estoque: true }
  })

  const statsCards = [
    { label: 'Faturamento do Dia', value: `R$ ${metricas.faturamentoDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    { label: 'Faturamento da Semana', value: `R$ ${metricas.faturamentoSemana.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    { label: 'Faturamento do Mês', value: `R$ ${metricas.faturamentoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    { label: 'Faturamento do Ano', value: `R$ ${metricas.faturamentoAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    { label: 'Ticket Médio', value: `R$ ${metricas.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    { label: 'Vendas Confirmadas', value: metricas.vendasConfirmadas },
    { label: 'Clientes Cadastrados', value: numClientes },
    { label: 'Pedidos Pendentes (S/ Pgto)', value: statsOp.pendentes },
  ]

  return (
    <div>
      <h1 style={{ fontSize: '2rem', marginBottom: '20px', fontFamily: 'var(--font-serif)' }}>Visão Geral</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {statsCards.map((stat, i) => (
          <div key={i} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>{stat.label}</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 600, color: '#0f172a' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Status de Pedidos Recentes */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', fontWeight: 600 }}>Status Operacional</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span>Aguardando Pagamento</span> <strong style={{ color: '#ef4444' }}>{statsOp.pendentes}</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span>Em Separação</span> <strong>{statsOp.separacao}</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span>Em Trânsito</span> <strong>{statsOp.enviados}</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span>Entregues</span> <strong style={{ color: '#10b981' }}>{statsOp.entregues}</strong>
            </li>
          </ul>
        </div>

        {/* Produtos Baixo Estoque */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', fontWeight: 600 }}>Alerta de Estoque Baixo</h3>
          {produtosBaixoEstoque.length === 0 ? (
            <p style={{ color: '#64748b' }}>Todos os produtos estão com estoque saudável.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {produtosBaixoEstoque.map((p, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span>{p.nome}</span> <strong style={{ color: '#ef4444' }}>{p.estoque} un</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
