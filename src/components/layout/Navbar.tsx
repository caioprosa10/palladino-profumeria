"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCartStore } from '@/store/cartStore'

export function Navbar() {
  const openDrawer = useCartStore((state) => state.openDrawer)
  const cartItemCount = useCartStore((state) => 
    state.cart.reduce((acc, item) => acc + item.quantidade, 0)
  )
  const router = useRouter()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setIsSearchOpen(false)
      router.push(`/busca?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <>
    <header className="main-header">
      <div className="logo" style={{ position: 'relative' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          {/* Placeholder invisível para empurrar o texto DUBAI ELIXIR e preservar o layout original */}
          <div style={{ width: '88px', height: '10px', marginRight: '15px', flexShrink: 0 }}></div>
          <Image 
            src="/logo-new.png" 
            alt="Dubai Elixir Logo" 
            width={88} 
            height={88} 
            className="floating-logo"
            style={{ position: 'absolute', top: '11px', left: 0, zIndex: 110, objectFit: 'contain' }}
          />
          <span style={{ position: 'relative', zIndex: 10 }}>DUBAI ELIXIR</span>
        </Link>
      </div>
      <nav className="nav-links">
        <Link href="/categoria/masculino" className="nav-item">Masculinos</Link>
        <Link href="/categoria/feminino" className="nav-item">Femininos</Link>
        <Link href="/categoria/cremes" className="nav-item">Cremes</Link>
        <Link href="/categoria/body-splash" className="nav-item">Body Splash</Link>
        <Link href="/categoria/nicho" className="nav-item">Nicho</Link>
        <Link href="/sobre" className="nav-item">Sobre</Link>
      </nav>
      <div className="header-actions">
        <button id="search-btn" aria-label="Buscar" className="icon-btn" onClick={() => setIsSearchOpen(!isSearchOpen)}>
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
        <Link href="/minha-conta" aria-label="Minha Conta" className="icon-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </Link>
        <button id="cart-btn" aria-label="Sacola de Compras" className="icon-btn" onClick={openDrawer} style={{ position: 'relative' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          {cartItemCount > 0 && (
            <span style={{ 
              position: 'absolute', top: -5, right: -5, 
              background: '#000', color: '#fff', fontSize: '10px', 
              borderRadius: '50%', width: '16px', height: '16px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {cartItemCount}
            </span>
          )}
        </button>
      </div>
    </header>

    {isSearchOpen && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '100px' }}>
        <div style={{ backgroundColor: '#fff', width: '90%', maxWidth: '600px', borderRadius: '8px', padding: '20px', position: 'relative' }}>
          <button onClick={() => setIsSearchOpen(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }}>
            ✕
          </button>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <input 
              autoFocus
              type="text" 
              placeholder="Pesquisar por perfumes, marcas, etc..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, padding: '12px 15px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
            />
            <button type="submit" style={{ padding: '12px 25px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
              Buscar
            </button>
          </form>
        </div>
      </div>
    )}

    </>
  )
}
