"use client"

import { useCartStore } from "@/store/cartStore"
import { Navbar } from "@/components/layout/Navbar"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, selectedFreight, selectedFreightName, selectedFreightId, cepDestino } = useCartStore()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  
  const subtotal = cart.reduce((acc, item) => acc + (item.produto.preco * item.quantidade), 0)
  const total = subtotal + selectedFreight

  // Padrão "montado": o carrinho vem do localStorage via zustand, então
  // renderizar antes da hidratação divergiria do HTML do servidor. Não há
  // como saber isso sem um efeito.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!mounted) return null

  if (cart.length === 0) {
    return (
      <>
        <Navbar />
        <div className="sub-page" style={{ padding: '150px 8%', textAlign: 'center', minHeight: '60vh' }}>
          <h2>Sua sacola está vazia</h2>
          <p style={{ marginTop: '20px', color: 'var(--color-text-secondary)' }}>Adicione produtos para prosseguir ao checkout.</p>
          <button className="btn btn-primary" onClick={() => router.push('/masculino')} style={{ marginTop: '30px' }}>Voltar à Loja</button>
        </div>
      </>
    )
  }

  const handleCheckoutPro = async () => {
    setLoading(true)
    setPaymentError('')
    
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          // O servidor recalcula o frete a partir destes dois campos;
          // o valor exibido ao cliente não é aceito como verdade.
          cepDestino,
          freteId: selectedFreightId,
        })
      })
      
      const data = await res.json()
      
      if (res.ok && data.url) {
        // Redireciona o usuário para o ambiente 100% seguro do Mercado Pago
        window.location.href = data.url
      } else {
        setPaymentError(data.error || 'Erro ao gerar link de pagamento.')
        setLoading(false)
      }
    } catch (error) {
      console.error(error)
      setPaymentError('Erro de rede ou servidor inacessível.')
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="sub-page" style={{ padding: '120px 8%', minHeight: '80vh', backgroundColor: 'var(--color-bg-alt)' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', textTransform: 'uppercase', marginBottom: '40px', letterSpacing: '0.1em' }}>Finalizar Compra</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '40px' }}>
          
          <div style={{ backgroundColor: '#fff', padding: '40px', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1rem' }}>Pagamento via Mercado Pago</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '30px', fontSize: '0.9rem' }}>
              Você será redirecionado para o ambiente 100% seguro do Mercado Pago para concluir sua compra. Suas informações estarão protegidas.
            </p>
            
            {paymentError && (
              <div style={{ padding: '15px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '4px', marginBottom: '20px' }}>
                {paymentError}
              </div>
            )}

            <button 
              onClick={handleCheckoutPro}
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#009EE3', /* Azul Oficial Mercado Pago */
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1.1rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 14px 0 rgba(0, 158, 227, 0.39)',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {loading ? 'Redirecionando para o Mercado Pago...' : 'Pagar com Mercado Pago'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '15px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    Pague com PIX, Cartão ou Boleto
                </span>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '40px', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '8px', height: 'fit-content' }}>
            <h3 style={{ marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1rem' }}>Resumo</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>{item.quantidade}x {item.produto.nome}</span>
                  <span>R$ {(item.produto.preco * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
            
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>Subtotal</span>
                <span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>Frete {selectedFreightName ? `(${selectedFreightName})` : ''}</span>
                <span>R$ {selectedFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 500, marginTop: '10px' }}>
                <span>Total</span>
                <span style={{ color: 'var(--color-gold-dark)' }}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
