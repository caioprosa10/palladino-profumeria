"use client"

import { useState } from 'react'
import { Product, useCartStore } from "@/store/cartStore"
import { ChevronRight, Minus, Plus, Share2, Truck, Star, Info, ShieldCheck, Droplets } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ProductDetailsProps {
  produto: any
  relatedProducts: any[]
}

export function ProductDetailsClient({ produto, relatedProducts }: ProductDetailsProps) {
  const [activeImage, setActiveImage] = useState(produto.imagens?.[0]?.url || '/imagem perfume/perfume-men-1.jpg')
  const [quantity, setQuantity] = useState(1)
  const [cep, setCep] = useState('')
  const [freteOptions, setFreteOptions] = useState<any[]>([])
  const [loadingFreight, setLoadingFreight] = useState(false)
  const [freightError, setFreightError] = useState('')
  
  const addToCart = useCartStore(state => state.addToCart)
  const router = useRouter()

  const handleAddToCart = () => {
    // Add multiple quantities
    for(let i=0; i<quantity; i++) {
      addToCart({
        id: produto.id,
        nome: produto.nome,
        slug: produto.slug,
        preco: produto.preco,
        descricao_curta: produto.descricao_curta,
        imagens: produto.imagens,
        atacado: produto.atacado
      })
    }
  }

  const handleBuyNow = () => {
    handleAddToCart()
    router.push('/checkout')
  }

  const handleCalcularFrete = async () => {
    const cleanCep = cep.replace(/\\D/g, '')
    if (cleanCep.length !== 8) {
      setFreightError("Por favor, informe um CEP válido com 8 dígitos.")
      return
    }

    setLoadingFreight(true)
    setFreteOptions([])
    setFreightError('')

    try {
      const res = await fetch('/api/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cepDestino: cleanCep, 
          cart: [{ produto, quantidade: quantity }]
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setFreightError(data.error || 'Erro ao calcular frete.')
        return
      }

      setFreteOptions(data)
    } catch (error) {
      console.error('Erro na requisição de frete', error)
      setFreightError('Não foi possível conectar ao serviço de fretes.')
    } finally {
      setLoadingFreight(false)
    }
  }

  const handleShare = async () => {
    try {
      await navigator.share({
        title: produto.nome,
        text: `Confira ${produto.nome} na Palladino Profumeria`,
        url: window.location.href,
      })
    } catch (err) {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copiado para a área de transferência!')
    }
  }

  return (
    <div style={{ padding: '140px 20px 60px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <a href="/" style={{ color: '#0f172a', textDecoration: 'none' }}>Home</a>
        <ChevronRight size={14} />
        <a href={`/categoria/${produto.categoria?.slug}`} style={{ color: '#0f172a', textDecoration: 'none' }}>{produto.categoria?.nome}</a>
        <ChevronRight size={14} />
        <span>{produto.nome}</span>
      </nav>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '60px' }}>
        
        {/* Gallery Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div 
            className="main-image-container"
            style={{ 
              width: '100%', aspectRatio: '1/1', backgroundColor: '#f8fafc', 
              borderRadius: '16px', overflow: 'hidden', position: 'relative',
              cursor: 'zoom-in', border: '1px solid #e2e8f0'
            }}
          >
            <img 
              src={activeImage} 
              alt={produto.nome}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            />
          </div>
          
          {produto.imagens && produto.imagens.length > 1 && (
            <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
              {produto.imagens.map((img: any) => (
                <div 
                  key={img.id}
                  onClick={() => setActiveImage(img.url)}
                  style={{ 
                    width: '80px', height: '80px', borderRadius: '10px', 
                    overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                    border: activeImage === img.url ? '2px solid #d4af37' : '1px solid #e2e8f0',
                    opacity: activeImage === img.url ? 1 : 0.6,
                    transition: 'all 0.2s'
                  }}
                >
                  <img src={img.url} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              {produto.marca && (
                <span style={{ color: '#d4af37', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                  {produto.marca.nome}
                </span>
              )}
              <button onClick={handleShare} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <Share2 size={20} />
              </button>
            </div>
            
            <h1 style={{ fontSize: '2.8rem', fontFamily: 'var(--font-serif)', lineHeight: 1.1, marginTop: '10px', color: '#0f172a' }}>
              {produto.nome}
            </h1>
            
            {produto.descricao_curta && (
              <p style={{ fontSize: '1.1rem', color: '#475569', marginTop: '15px', lineHeight: 1.5 }}>
                {produto.descricao_curta}
              </p>
            )}
          </div>

          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#0f172a' }}>
            {produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '10px' }}>
            <div style={{ 
              display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', 
              borderRadius: '8px', padding: '5px' 
            }}>
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{ width: '40px', height: '40px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Minus size={18} />
              </button>
              <span style={{ width: '30px', textAlign: 'center', fontWeight: 600 }}>{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                style={{ width: '40px', height: '40px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={18} />
              </button>
            </div>
            
            <button 
              onClick={handleAddToCart}
              style={{ 
                flex: 1, padding: '16px', backgroundColor: '#fff', color: '#0f172a', 
                border: '2px solid #0f172a', borderRadius: '8px', fontSize: '1rem', 
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9' }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fff' }}
            >
              Adicionar à Sacola
            </button>
            
            <button 
              onClick={handleBuyNow}
              style={{ 
                flex: 1, padding: '16px', backgroundColor: '#0f172a', color: '#fff', 
                border: '2px solid #0f172a', borderRadius: '8px', fontSize: '1rem', 
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1e293b' }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#0f172a' }}
            >
              Comprar Agora
            </button>
          </div>

          {/* Shipping */}
          <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <Truck size={20} color="#64748b" />
              <strong style={{ fontSize: '0.95rem' }}>Calcular Frete e Prazo</strong>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="00000-000" 
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
              <button 
                onClick={handleCalcularFrete}
                style={{ padding: '0 20px', backgroundColor: '#e2e8f0', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                OK
              </button>
            </div>
            {freightError && (
              <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#ef4444' }}>
                {freightError}
              </div>
            )}
            {loadingFreight && (
              <div style={{ marginTop: '15px', fontSize: '0.9rem', color: '#64748b', textAlign: 'center' }}>
                Calculando...
              </div>
            )}
            {freteOptions.length > 0 && (
              <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {freteOptions.map((opt, i) => (
                  <div key={i} style={{ fontSize: '0.9rem', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span>{opt.name}</span>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ display: 'block', color: '#0f172a' }}>{opt.price}</strong>
                      <span style={{ fontSize: '0.8rem' }}>{opt.delivery_time} dias úteis</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Highlights */}
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            {produto.fragrancia && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#475569', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '20px' }}>
                <Droplets size={14} color="#d4af37" /> {produto.fragrancia}
              </div>
            )}
            {produto.concentracao && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#475569', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '20px' }}>
                <Star size={14} color="#d4af37" /> {produto.concentracao}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#475569', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '20px' }}>
              <ShieldCheck size={14} color="#d4af37" /> Produto 100% Original
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Description Tabs */}
      <div style={{ marginTop: '80px', borderTop: '1px solid #e2e8f0', paddingTop: '60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
          
          {/* Coluna 1: Pirâmide Olfativa e Detalhes */}
          <div>
            <h2 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-serif)', marginBottom: '20px' }}>Sobre a Fragrância</h2>
            
            {produto.descricao_olfativa ? (
              <div style={{ color: '#475569', lineHeight: 1.7, fontSize: '1.05rem', whiteSpace: 'pre-line', marginBottom: '30px' }}>
                {produto.descricao_olfativa}
              </div>
            ) : (
              <div style={{ color: '#475569', lineHeight: 1.7, fontSize: '1.05rem', whiteSpace: 'pre-line', marginBottom: '30px' }}>
                {produto.descricao}
              </div>
            )}

            {produto.notas_olfativas && (
              <div style={{ backgroundColor: '#f8fafc', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-serif)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Droplets size={18} color="#d4af37" /> Pirâmide Olfativa
                </h3>
                <p style={{ color: '#475569', lineHeight: 1.8, fontSize: '0.95rem' }}>
                  {produto.notas_olfativas.split('|').map((nota: string, i: number) => {
                    const [titulo, ...resto] = nota.split(':')
                    return (
                      <span key={i} style={{ display: 'block', marginBottom: '8px' }}>
                        <strong style={{ color: '#0f172a' }}>{titulo}:</strong> {resto.join(':')}
                      </span>
                    )
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Coluna 2: Especificações Técnicas */}
          <div>
            <h2 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-serif)', marginBottom: '20px' }}>Especificações</h2>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', padding: '15px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <span style={{ width: '40%', color: '#64748b', fontWeight: 500 }}>Marca</span>
                <span style={{ width: '60%', color: '#0f172a', fontWeight: 600 }}>{produto.marca?.nome || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', padding: '15px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
                <span style={{ width: '40%', color: '#64748b', fontWeight: 500 }}>Categoria</span>
                <span style={{ width: '60%', color: '#0f172a', fontWeight: 600 }}>{produto.categoria?.nome || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', padding: '15px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <span style={{ width: '40%', color: '#64748b', fontWeight: 500 }}>Gênero</span>
                <span style={{ width: '60%', color: '#0f172a', fontWeight: 600 }}>{produto.genero || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', padding: '15px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
                <span style={{ width: '40%', color: '#64748b', fontWeight: 500 }}>Concentração</span>
                <span style={{ width: '60%', color: '#0f172a', fontWeight: 600 }}>{produto.concentracao || 'EDP'}</span>
              </div>
              <div style={{ display: 'flex', padding: '15px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <span style={{ width: '40%', color: '#64748b', fontWeight: 500 }}>Volume</span>
                <span style={{ width: '60%', color: '#0f172a', fontWeight: 600 }}>{produto.volume_ml ? `${produto.volume_ml}ml` : '100ml'}</span>
              </div>
              <div style={{ display: 'flex', padding: '15px 20px', backgroundColor: '#fff' }}>
                <span style={{ width: '40%', color: '#64748b', fontWeight: 500 }}>SKU</span>
                <span style={{ width: '60%', color: '#0f172a', fontWeight: 600 }}>{produto.sku || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div style={{ marginTop: '100px' }}>
          <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)', marginBottom: '30px', textAlign: 'center' }}>
            Você também pode gostar
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '30px' }}>
            {relatedProducts.map(p => (
              <a href={`/produto/${p.slug}`} key={p.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', transition: 'transform 0.3s' }}
                     onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                     onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#f8fafc' }}>
                    <img src={p.imagens?.[0]?.url || '/imagem perfume/perfume-men-1.jpg'} alt={p.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '20px' }}>
                    <span style={{ color: '#d4af37', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{p.marca?.nome || 'N/A'}</span>
                    <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-serif)', margin: '5px 0 10px' }}>{p.nome}</h3>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>{p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
