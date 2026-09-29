"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, Suspense, useRef } from "react"
import { useCartStore } from "@/store/cartStore"
import { Navbar } from "@/components/layout/Navbar"
import Link from "next/link"

// O componente interno que lida com a lógica do client e os searchParams
function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const payment_id = searchParams.get('payment_id')
  const status = searchParams.get('status')
  const external_reference = searchParams.get('external_reference')
  
  const { clearCart } = useCartStore()
  
  const [loading, setLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)
  
  const hasClearedCart = useRef(false)
  const hasValidated = useRef(false)

  useEffect(() => {
    // 1. Limpeza Segura do Carrinho (evita o dobro do Strict Mode)
    if (!hasClearedCart.current && (status === 'approved' || status === 'pending')) {
      clearCart()
      hasClearedCart.current = true
    }

    // 2. Validação do Pagamento no Backend (Arquitetura Preparada)
    const validatePayment = async () => {
      if (hasValidated.current) return
      
      if (!payment_id) {
        setPaymentStatus('error')
        setLoading(false)
        return
      }

      hasValidated.current = true

      try {
        /*
          ARQUITETURA DE VALIDAÇÃO (FUTURA):
          Aqui você faria um fetch para sua rota privada:
          
          const res = await fetch(`/api/payment/verify?payment_id=${payment_id}`)
          const data = await res.json()
          
          if (res.ok && data.status === 'approved') {
             setPaymentStatus('approved')
          }
          
          Para este momento, vamos assumir o status da URL, mas com delay simulado
          para demonstrar o Loading State premium.
        */
        
        // Simulação de delay de rede
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        if (status === 'approved') {
          setPaymentStatus('approved')
        } else if (status === 'pending' || status === 'in_process') {
          setPaymentStatus('pending')
        } else if (status === 'rejected') {
          setPaymentStatus('rejected')
        } else {
          setPaymentStatus('error')
        }
      } catch (error) {
        console.error("Erro na validação do pagamento:", error)
        setPaymentStatus('error')
      } finally {
        setLoading(false)
      }
    }

    validatePayment()
  }, [payment_id, status, clearCart])

  // ================= ESTADOS VISUAIS =================

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '20px' }}>
        <div style={{ width: '50px', height: '50px', borderRadius: '50%', border: '3px solid var(--color-bg-alt)', borderTopColor: 'var(--color-gold)', animation: 'spin 1s linear infinite' }} />
        <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)', letterSpacing: '0.05em' }}>Processando confirmação...</h2>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  if (paymentStatus === 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '0 20px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', marginBottom: '30px' }}>
          ✕
        </div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '20px' }}>Erro ao validar pedido</h2>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '500px', marginBottom: '40px', lineHeight: '1.6' }}>
          Não foi possível encontrar as informações do seu pagamento. Por favor, verifique seus e-mails ou entre em contato com nosso suporte.
        </p>
        <button onClick={() => router.push('/')} className="btn btn-primary" style={{ padding: '15px 40px' }}>
          Voltar para o Início
        </button>
      </div>
    )
  }

  if (paymentStatus === 'rejected') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '0 20px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', marginBottom: '30px' }}>
          !
        </div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '20px' }}>Pagamento Recusado</h2>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '500px', marginBottom: '40px', lineHeight: '1.6' }}>
          Infelizmente o seu pagamento não foi aprovado pelo Mercado Pago. Nenhuma cobrança foi efetivada.
        </p>
        <button onClick={() => router.push('/checkout')} className="btn btn-primary" style={{ padding: '15px 40px', backgroundColor: '#009EE3', border: 'none', color: 'white' }}>
          Tentar Novamente
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      
      {/* Ícone Premium */}
      <div style={{ 
        width: '90px', height: '90px', 
        borderRadius: '50%', 
        backgroundColor: paymentStatus === 'pending' ? '#fef3c7' : '#ecfdf5',
        color: paymentStatus === 'pending' ? '#d97706' : '#059669',
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        fontSize: '45px', marginBottom: '40px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
      }}>
        {paymentStatus === 'pending' ? '⌚' : '✓'}
      </div>

      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', marginBottom: '20px', letterSpacing: '0.05em', color: 'var(--color-text)' }}>
        {paymentStatus === 'pending' ? 'Pagamento Pendente' : 'Pedido confirmado com sucesso!'}
      </h1>

      <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', maxWidth: '600px', marginBottom: '50px', lineHeight: '1.8' }}>
        {paymentStatus === 'pending' 
          ? 'O seu pedido foi gerado e está aguardando a compensação do pagamento. Assim que aprovado, começaremos a prepará-lo.'
          : 'Obrigado pela sua compra. Recebemos seu pagamento e já estamos preparando o seu pedido. Em breve você receberá novas atualizações por e-mail.'}
      </p>

      {/* Resumo Box */}
      <div style={{ 
        backgroundColor: '#fff', 
        padding: '40px', 
        borderRadius: '12px', 
        width: '100%',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        border: '1px solid rgba(0,0,0,0.05)',
        textAlign: 'left',
        marginBottom: '50px'
      }}>
        <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.9rem', marginBottom: '25px', color: 'var(--color-text)', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '15px' }}>
          Detalhes do Pedido
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Transação</div>
            <div style={{ fontWeight: 500 }}>#{payment_id}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Referência</div>
            <div style={{ fontWeight: 500 }}>{external_reference || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Status</div>
            <div style={{ 
              fontWeight: 600, 
              color: paymentStatus === 'pending' ? '#d97706' : '#059669',
              textTransform: 'uppercase',
              fontSize: '0.9rem'
            }}>
              {paymentStatus === 'pending' ? 'Aguardando Pagamento' : 'Aprovado'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Data</div>
            <div style={{ fontWeight: 500 }}>{new Date().toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/" style={{ 
          padding: '16px 40px', 
          border: '1px solid var(--color-text)', 
          color: 'var(--color-text)', 
          textDecoration: 'none',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontSize: '0.9rem',
          fontWeight: 500,
          borderRadius: '4px',
          transition: 'all 0.3s ease'
        }}>
          Voltar para o Início
        </Link>
        <button style={{ 
          padding: '16px 40px', 
          backgroundColor: 'var(--color-primary)', 
          color: '#fff',
          border: 'none',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontSize: '0.9rem',
          fontWeight: 600,
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Meus Pedidos
        </button>
      </div>

    </div>
  )
}

// O componente pai que provê a fronteira do Suspense para o Next.js
export default function SuccessPage() {
  return (
    <>
      <Navbar />
      <div className="sub-page" style={{ 
        padding: '120px 5%', 
        minHeight: '80vh', 
        backgroundColor: 'var(--color-bg-alt)' 
      }}>
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #ccc', borderTopColor: '#333', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          </div>
        }>
          <SuccessContent />
        </Suspense>
      </div>
    </>
  )
}
