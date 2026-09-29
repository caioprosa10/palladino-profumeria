"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { name: 'Pedidos', path: '/admin/pedidos', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
    { name: 'Clientes', path: '/admin/clientes', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { name: 'Produtos', path: '/admin/produtos', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { name: 'Financeiro', path: '/admin/financeiro', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { name: 'Usuários', path: '/admin/usuarios', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { name: 'Tokens', path: '/admin/tokens', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4v-3l8.44-8.44A6 6 0 0115 7h.01' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#1e293b', fontFamily: 'var(--font-sans)' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', backgroundColor: '#0f172a', color: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#fff' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', letterSpacing: '0.1em' }}>PALLADINO</span>
          </Link>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '5px' }}>Painel Administrativo</div>
        </div>

        <nav style={{ flex: 1, padding: '20px 10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path))
            return (
              <Link 
                key={item.path} 
                href={item.path}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', borderRadius: '6px',
                  textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500,
                  backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: isActive ? '#fff' : '#94a3b8',
                  transition: 'all 0.2s'
                }}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon}></path>
                </svg>
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Link href="/minha-conta" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#94a3b8', fontSize: '0.85rem' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
            Sair do Painel
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ height: '60px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '0 30px', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>Sessão Administrativa Segura</div>
        </header>
        <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
