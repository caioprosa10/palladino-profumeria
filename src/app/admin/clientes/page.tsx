import { prisma } from '@/lib/prisma'
import { requireAdminPage } from '@/lib/guard'

export default async function AdminClientes() {
  await requireAdminPage()

  const clientes = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    orderBy: { createdAt: 'desc' },
    // select explícito: sem ele o Prisma traz também o hash da senha.
    select: {
      id: true,
      nome: true,
      email: true,
      telefone: true,
      ativo: true,
      createdAt: true,
      _count: { select: { pedidos: true } }
    }
  })

  const formatDate = (date: Date) => new Date(date).toLocaleString('pt-BR')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)' }}>Gestão de Clientes</h1>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Nome</th>
              <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>E-mail</th>
              <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Telefone</th>
              <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Data de Cadastro</th>
              <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Pedidos</th>
              <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Status</th>
              <th style={{ padding: '15px', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '15px', fontSize: '0.9rem', fontWeight: 500 }}>{c.nome}</td>
                <td style={{ padding: '15px', fontSize: '0.9rem' }}>{c.email}</td>
                <td style={{ padding: '15px', fontSize: '0.9rem' }}>{c.telefone || '-'}</td>
                <td style={{ padding: '15px', fontSize: '0.9rem' }}>{formatDate(c.createdAt)}</td>
                <td style={{ padding: '15px', fontSize: '0.9rem' }}>{c._count.pedidos}</td>
                <td style={{ padding: '15px', fontSize: '0.9rem' }}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
                    backgroundColor: c.ativo ? '#dcfce7' : '#fee2e2',
                    color: c.ativo ? '#166534' : '#991b1b'
                  }}>
                    {c.ativo ? 'Ativo' : 'Bloqueado'}
                  </span>
                </td>
                <td style={{ padding: '15px', fontSize: '0.9rem' }}>
                  <button style={{ color: '#0ea5e9', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 500 }}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Nenhum cliente cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
