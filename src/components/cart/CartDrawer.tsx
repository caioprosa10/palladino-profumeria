"use client"

import { useEffect, useState } from 'react'
import { useCartStore } from '@/store/cartStore'
import { useRouter } from 'next/navigation'

export function CartDrawer() {
  const router = useRouter()
  const { 
    isDrawerOpen, closeDrawer, 
    cart, orders, activeTab, setTab, 
    removeFromCart, selectedFreight, selectedFreightName, setFreight, clearCart, addOrder,
    shippingOptions, setShippingOptions
  } = useCartStore()

  const [cep, setCep] = useState('')
  const [loadingFreight, setLoadingFreight] = useState(false)
  const [freightError, setFreightError] = useState<string | null>(null)
  const [isFreightExpanded, setIsFreightExpanded] = useState(true)

  // Desabilita o scroll do body quando o drawer estiver aberto
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }, [isDrawerOpen])

  const subtotal = cart.reduce((acc, item) => acc + (item.produto.preco * item.quantidade), 0)
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantidade, 0)
  const total = subtotal + selectedFreight

  const handleCalcFreight = async () => {
    setFreightError(null)

    if (cart.length === 0) {
      setFreightError("Adicione itens à sacola antes de calcular o frete.")
      return
    }
    if (cep.replace(/\D/g, '').length !== 8) {
      setFreightError("Por favor, informe um CEP válido com 8 dígitos.")
      return
    }

    setLoadingFreight(true)
    setShippingOptions([])
    
    try {
      const res = await fetch('/api/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cepDestino: cep, cart })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setFreightError(data.error || 'Erro ao calcular frete.')
        return
      }

      setShippingOptions(data)
      setIsFreightExpanded(true)
    } catch (error) {
      console.error('Erro na requisição de frete', error)
      setFreightError('Não foi possível conectar ao serviço de fretes.')
    } finally {
      setLoadingFreight(false)
    }
  }

  const handleCheckout = () => {
    if (cart.length === 0) return

    // Regra do Atacado: Produtos de atacado requerem no mínimo 6 unidades no total
    const wholesaleItems = cart.filter(item => item.produto.atacado)
    const wholesaleQty = wholesaleItems.reduce((sum, item) => sum + item.quantidade, 0)

    if (wholesaleItems.length > 0 && wholesaleQty < 6) {
      alert('Atenção: O pedido mínimo para itens da categoria Atacado é de 6 unidades.')
      return
    }

    if (selectedFreight === 0) {
      alert('Por favor, calcule e selecione o frete antes de finalizar a compra.')
      return
    }

    // Redireciona para página de checkout (que ainda vamos criar)
    // Para simplificar, na fase 1 o checkout simula o pedido aqui ou na pág de checkout
    closeDrawer()
    router.push('/checkout')
  }

  return (
    <div id="cart-drawer" className={`cart-drawer ${isDrawerOpen ? 'open' : ''}`}>
      <div className="drawer-overlay" id="drawer-overlay" onClick={closeDrawer}></div>
      <div className="drawer-content">
        <div className="drawer-header">
          <h3 className="drawer-title">Meu Universo</h3>
          <button onClick={closeDrawer} className="close-drawer-btn" aria-label="Fechar Sacola">&times;</button>
        </div>
        
        <div className="drawer-tabs">
          <button 
            onClick={() => setTab('cart')} 
            className={`tab-btn ${activeTab === 'cart' ? 'active' : ''}`}
          >
            Sacola (<span>{cartItemCount}</span>)
          </button>
          <button 
            onClick={() => setTab('orders')} 
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          >
            Pedidos (<span>{orders.length}</span>)
          </button>
        </div>
        
        <div className="drawer-body">
          {/* Aba Carrinho */}
          <div className={`tab-content ${activeTab === 'cart' ? 'active' : ''}`}>
            <div className="cart-items-container">
              {cart.length === 0 ? (
                <div className="no-orders">
                  <p>Sua sacola está vazia.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div className="cart-item" key={item.id}>
                    <img 
                      src={item.produto.imagens[0]?.url || '/imagem perfume/perfume-men-1.jpg'} 
                      alt={item.produto.nome} 
                      className={`cart-item-img ${item.produto.slug.includes('boisee') ? 'card-img-variant-blue' : item.produto.slug.includes('cuir') ? 'card-img-variant-amber' : item.produto.slug.includes('blanc') ? 'card-img-variant-silver' : item.produto.slug.includes('eclat') ? 'card-img-variant-gold' : ''}`} 
                    />
                    <div className="cart-item-info">
                      <h4 className="cart-item-name">{item.produto.nome}</h4>
                      <span className="cart-item-desc">{item.produto.descricao_curta}</span>
                      <div className="cart-item-quantity-price">
                        <span className="cart-item-qty">Qtd: {item.quantidade}</span>
                        <span className="cart-item-price">
                          R$ {(item.produto.preco * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <button className="remove-item-btn" onClick={() => removeFromCart(item.id)} aria-label="Remover item">&times;</button>
                  </div>
                ))
              )}
            </div>
            
            <div className="cart-summary-footer">
              {/* Cálculo de Frete */}
              <div className="freight-section" style={{ marginBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', display: 'block' }}>
                    Calcular Frete
                  </span>
                  {shippingOptions.length > 0 && (
                    <button 
                      onClick={() => setIsFreightExpanded(!isFreightExpanded)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#d4af37', fontWeight: 600 }}
                      aria-label={isFreightExpanded ? "Recolher opções de frete" : "Expandir opções de frete"}
                    >
                      {isFreightExpanded ? 'Ocultar Opções ▲' : 'Ver Opções ▼'}
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    maxLength={9}
                    placeholder="00000-000" 
                    value={cep}
                    onChange={(e) => {
                      // Remove caracteres não numéricos
                      let v = e.target.value.replace(/\D/g, '')
                      // Aplica a máscara 00000-000
                      if (v.length > 5) {
                        v = v.replace(/^(\d{5})(\d)/, '$1-$2')
                      }
                      setCep(v)
                      if (freightError) setFreightError(null)
                    }}
                    style={{ padding: '10px', border: '1px solid rgba(0,0,0,0.1)', flex: 1, borderRadius: '4px' }}
                  />
                  <button onClick={handleCalcFreight} disabled={loadingFreight} className="btn-card" style={{ padding: '10px 15px', opacity: loadingFreight ? 0.7 : 1 }}>
                    {loadingFreight ? 'Calculando...' : 'Calcular'}
                  </button>
                </div>
                {freightError && (
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '10px' }}>{freightError}</p>
                )}
                {shippingOptions.length > 0 && isFreightExpanded && (
                  <div style={{ display: 'flex', marginTop: '15px', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '5px' }}>
                    {shippingOptions.map((option) => (
                      <label key={option.id} style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <input 
                            type="radio" 
                            name="freight" 
                            value={option.price}
                            checked={selectedFreightName === option.name}
                            onChange={() => setFreight(Number(option.price), option.name, option.custom_delivery_time)} 
                          /> {option.name} <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>({option.custom_delivery_time} dias úteis)</span>
                        </span>
                        <strong>R$ {Number(option.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumo de Valores */}
              <div className="summary-line">
                <span>Subtotal</span>
                <span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              {selectedFreight > 0 && (
                <div className="summary-line">
                  <span>Frete</span>
                  <span>R$ {selectedFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="summary-line highlight-total">
                <span>Total a Pagar</span>
                <span className="cart-total-value">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <button 
                onClick={handleCheckout} 
                className="btn btn-primary btn-block" 
                disabled={cart.length === 0} 
                style={{ opacity: cart.length === 0 ? 0.5 : 1 }}
              >
                Confirmar Pedido
              </button>
            </div>
          </div>

          {/* Aba Pedidos */}
          <div className={`tab-content ${activeTab === 'orders' ? 'active' : ''}`}>
            <div className="orders-container">
              {orders.length === 0 ? (
                <div className="no-orders">
                  <p>Nenhum pedido realizado ainda.</p>
                </div>
              ) : (
                orders.map(order => (
                  <div className="order-card" key={order.id}>
                    <div className="order-header">
                      <span className="order-id">{order.id}</span>
                      <span className="order-date">{order.date}</span>
                    </div>
                    <div className="order-items-summary">
                      {order.items.map((item, idx) => (
                        <div key={idx}>
                          {item.qty}x {item.name} 
                          <span style={{ float: 'right', color: 'var(--color-text-muted)' }}>
                            R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="order-status-container">
                      <span className={`order-status-badge ${order.status === 'preparo' ? 'status-preparo' : order.status === 'transito' ? 'status-transito' : 'status-entregue'}`}>
                        {order.status === 'preparo' ? 'Em Preparação' : order.status === 'transito' ? 'Em Trânsito' : 'Entregue'}
                      </span>
                    </div>
                    <div className="order-total-highlight">
                      <span>Valor Total Pago</span>
                      <span className="order-total-price">
                        R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
