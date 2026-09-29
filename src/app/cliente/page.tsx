import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Navbar } from '@/components/layout/Navbar'
import Link from 'next/link'

export default async function ClientePage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value

  if (!sessionCookie) {
    redirect('/login')
  }

  const session = await decrypt(sessionCookie)

  if (!session || !session.id) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id as string },
    include: {
      pedidos: {
        orderBy: { createdAt: 'desc' },
        include: { itens: { include: { produto: true } }, pagamentoObj: true, shipping: true }
      }
    }
  })

  if (!user) {
    redirect('/login')
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  }

  return (
    <>
      <Navbar />
      <div className="sub-page" style={{ padding: '120px 5%', minHeight: '80vh', backgroundColor: '#fafafa' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', color: 'var(--color-text)' }}>Minha Conta</h1>
            
            <form action="/api/auth/logout" method="POST">
              <button type="submit" style={{ padding: '10px 20px', border: '1px solid #ccc', backgroundColor: 'transparent', cursor: 'pointer', borderRadius: '4px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sair
              </button>
            </form>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '40px' }}>
            
            {/* Sidebar Lateral */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ padding: '25px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', fontFamily: 'var(--font-serif)' }}>Meus Dados</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '5px' }}><strong>Nome:</strong> {user.nome}</p>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '5px' }}><strong>E-mail:</strong> {user.email}</p>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}><strong>Membro desde:</strong> {new Date(user.createdAt).toLocaleDateString('pt-BR')}</p>
                <Link href="/cliente/editar" style={{ color: 'var(--color-primary)', fontSize: '0.9rem', textDecoration: 'underline' }}>Editar Dados</Link>
              </div>

              <div style={{ padding: '25px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <li><Link href="/cliente" style={{ fontWeight: 600, color: 'var(--color-text)', textDecoration: 'none' }}>Meus Pedidos</Link></li>
                  <li><Link href="/cliente/enderecos" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Endereços</Link></li>
                  <li><Link href="/cliente/senha" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Alterar Senha</Link></li>
                </ul>
              </div>
            </div>

            {/* Conteúdo Principal (Pedidos) */}
            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', marginBottom: '20px' }}>Meus Pedidos</h2>
              
              {user.pedidos.length === 0 ? (
                <div style={{ padding: '40px', backgroundColor: '#fff', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                  <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px' }}>Você ainda não realizou nenhuma compra.</p>
                  <Link href="/" className="btn btn-primary" style={{ padding: '12px 30px' }}>Explorar Produtos</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {user.pedidos.map(pedido => (
                    <div key={pedido.id} style={{ padding: '25px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #eee' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '15px' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Pedido</span>
                          <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>#{pedido.id.split('-')[0].toUpperCase()}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Data</span>
                          <div style={{ fontWeight: 500 }}>{formatDate(pedido.createdAt)}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Total</span>
                          <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>R$ {pedido.total.toFixed(2).replace('.', ',')}</div>
                        </div>
                        <div>
                          <span style={{ 
                            padding: '6px 12px', 
                            borderRadius: '20px', 
                            fontSize: '0.8rem', 
                            fontWeight: 600, 
                            textTransform: 'uppercase',
                            backgroundColor: pedido.status === 'pago' ? '#ecfdf5' : pedido.status === 'aguardando_pagamento' ? '#fef3c7' : '#f3f4f6',
                            color: pedido.status === 'pago' ? '#059669' : pedido.status === 'aguardando_pagamento' ? '#d97706' : '#4b5563',
                          }}>
                            {pedido.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Produtos do Pedido */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {pedido.itens.map(item => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <span style={{ color: 'var(--color-text-secondary)' }}>{item.quantidade}x</span>
                              <span>{item.produto.nome}</span>
                            </div>
                            <span>R$ {item.preco.toFixed(2).replace('.', ',')}</span>
                          </div>
                        ))}
                      </div>

                      {pedido.shipping?.rastreamento && (
                        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Rastreamento ({pedido.shipping.transportadora})</span>
                            <div style={{ fontWeight: 600, letterSpacing: '1px' }}>{pedido.shipping.rastreamento}</div>
                          </div>
                          <a href="https://rastreamento.correios.com.br/app/index.php" target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#009EE3', textDecoration: 'underline' }}>Rastrear</a>
                        </div>
                      )}
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
