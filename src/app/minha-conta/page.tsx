import { Navbar } from '@/components/layout/Navbar'
import { sessaoAtual } from '@/lib/sessao'
import { prisma } from '@/lib/prisma'
import { decifrar } from '@/lib/cripto'
import { redirect } from 'next/navigation'
import LogoutButton from './LogoutButton'

export default async function MinhaContaPage() {
  const payload = await sessaoAtual()

  if (!payload) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    include: {
      pedidos: true,
      enderecos: true,
    }
  })

  if (!user) {
    redirect('/login')
  }

  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN'

  return (
    <>
      <Navbar />
      <div className="sub-page" style={{ padding: '120px 8%', minHeight: '80vh', backgroundColor: 'var(--color-bg-alt)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
          
          <div style={{ flex: '1', backgroundColor: '#fff', padding: '40px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', textTransform: 'uppercase', marginBottom: '20px' }}>Meu Perfil</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Nome</label>
                <p style={{ fontSize: '1rem', fontWeight: 500 }}>{user.nome}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>E-mail</label>
                <p style={{ fontSize: '1rem' }}>{user.email}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>CPF</label>
                <p style={{ fontSize: '1rem' }}>{decifrar(user.cpf) || 'Não informado'}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Telefone</label>
                <p style={{ fontSize: '1rem' }}>{user.telefone || 'Não informado'}</p>
              </div>
            </div>
            
            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {isAdmin && (
                <a href="/admin" className="btn btn-primary" style={{ width: '100%', textAlign: 'center', textDecoration: 'none' }}>
                  Acessar Painel Admin
                </a>
              )}
              <LogoutButton />
            </div>
          </div>

          <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <div style={{ backgroundColor: '#fff', padding: '40px', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', textTransform: 'uppercase', marginBottom: '20px' }}>Meus Pedidos</h3>
              {user.pedidos.length === 0 ? (
                <p style={{ color: 'var(--color-text-secondary)' }}>Você ainda não possui pedidos.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {user.pedidos.map(pedido => (
                    <div key={pedido.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontWeight: 500 }}>Pedido #{pedido.id.slice(-6).toUpperCase()}</span>
                        <span>{new Date(pedido.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        <span style={{ textTransform: 'capitalize' }}>Status: {pedido.status}</span>
                        <span>R$ {pedido.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ backgroundColor: '#fff', padding: '40px', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', textTransform: 'uppercase', marginBottom: '20px' }}>Endereços</h3>
              {user.enderecos.length === 0 ? (
                <p style={{ color: 'var(--color-text-secondary)' }}>Nenhum endereço cadastrado.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {user.enderecos.map(end => (
                    <div key={end.id} style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                      <p>{end.rua}, {end.numero} {end.complemento && `- ${end.complemento}`}</p>
                      <p>{end.bairro} - {end.cidade}/{end.estado}</p>
                      <p>CEP: {end.cep}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
