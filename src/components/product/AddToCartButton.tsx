"use client"

import { Product, useCartStore } from "@/store/cartStore"

interface AddToCartButtonProps {
  product: Product
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const addToCart = useCartStore(state => state.addToCart)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    addToCart(product)
  }

  return (
    <button 
      onClick={handleAddToCart}
      style={{
        backgroundColor: '#0f172a',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        padding: '16px 32px',
        fontSize: '1.1rem',
        fontWeight: 600,
        cursor: 'pointer',
        width: '100%',
        marginTop: '20px',
        transition: 'background-color 0.2s',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '10px'
      }}
      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0f172a'}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <path d="M16 10a4 4 0 0 1-8 0"></path>
      </svg>
      Adicionar à Sacola
    </button>
  )
}
