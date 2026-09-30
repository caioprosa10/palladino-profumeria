"use client"

import { v4 as uuidv4 } from 'uuid'
import { useState, useRef, useEffect } from 'react'
import { X, Send, Bot, User, Loader2, MessageCircle, RefreshCw, ChevronRight } from 'lucide-react'
import { CHATBOT_QUESTIONS, CHATBOT_MESSAGES, matchSynonym, ChatbotStep, ChatPreferences, QuestionConfig } from '@/lib/chatbot/config'
import Link from 'next/link'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string | React.ReactNode
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [input, setInput] = useState('')
  
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init', role: 'assistant', content: CHATBOT_MESSAGES.greeting },
    { id: 'first_question', role: 'assistant', content: CHATBOT_QUESTIONS['CATEGORY'].text }
  ])
  const [step, setStep] = useState<ChatbotStep>('CATEGORY')
  const [currentQ, setCurrentQ] = useState<QuestionConfig>(CHATBOT_QUESTIONS['CATEGORY'])
  const [preferences, setPreferences] = useState<ChatPreferences>({})
  const [isLoading, setIsLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, step])

  const advanceStep = async (currentStep: ChatbotStep, userText: string) => {
    const matchedValue = matchSynonym(userText)
    
    // Always accept the exact text if we can't find a synonym, or fallback to unknown
    if (!matchedValue && currentStep !== 'CATEGORY') {
      setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: CHATBOT_MESSAGES.fallback }])
      return
    }

    let nextStep: ChatbotStep = 'RECOMMENDATION'
    let nextQ: QuestionConfig | null = null
    const newPrefs = { ...preferences }

    if (currentStep === 'CATEGORY') {
      const cat = matchedValue || 'perfumes'
      newPrefs.categoria = cat
      
      if (cat === 'kits') {
        nextStep = 'GENDER'
        nextQ = CHATBOT_QUESTIONS['GENDER_KIT']
      } else {
        nextStep = 'GENDER'
        nextQ = CHATBOT_QUESTIONS['GENDER']
      }
    } 
    else if (currentStep === 'GENDER') {
      newPrefs.genero = matchedValue || ''
      
      if (newPrefs.categoria === 'kits') {
        nextStep = 'RECOMMENDATION'
      } else if (newPrefs.categoria === 'cremes') {
        nextStep = 'STYLE'
        nextQ = CHATBOT_QUESTIONS['STYLE_CREAM']
      } else if (newPrefs.categoria === 'body-splash') {
        nextStep = 'STYLE'
        nextQ = CHATBOT_QUESTIONS['STYLE_SPLASH']
      } else {
        nextStep = 'STYLE'
        nextQ = CHATBOT_QUESTIONS['STYLE_PERFUME']
      }
    } 
    else if (currentStep === 'STYLE') {
      newPrefs.estilo = matchedValue || undefined
      
      if (newPrefs.categoria === 'cremes') {
        nextStep = 'RECOMMENDATION'
      } else {
        nextStep = 'OCCASION'
        nextQ = CHATBOT_QUESTIONS['OCCASION']
      }
    } 
    else if (currentStep === 'OCCASION') {
      newPrefs.ocasiao = matchedValue || undefined
      nextStep = 'RECOMMENDATION'
    }

    setPreferences(newPrefs)
    setStep(nextStep)
    if (nextQ) setCurrentQ(nextQ)

    if (nextStep !== 'RECOMMENDATION' && nextQ) {
      setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: nextQ.text }])
    } else if (nextStep === 'RECOMMENDATION') {
      await fetchRecommendations(newPrefs)
    }
  }

  const fetchRecommendations = async (prefs: ChatPreferences) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs })
      })
      
      const data = await res.json()
      
      if (!data.products || data.products.length === 0) {
        setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: data.message || "Não encontramos produtos para esta solicitação." }])
        setStep('END')
        return
      }

      const productsHtml = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
          <span style={{ lineHeight: '1.5' }}>{data.message}</span>
          {data.products.map((p: any) => (
            <div key={p.id} style={{ 
              border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', 
              backgroundColor: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              <div>
                <strong style={{ display: 'block', color: '#0f172a', fontSize: '1.05rem', fontFamily: 'var(--font-serif)' }}>{p.nome}</strong>
                <span style={{ fontSize: '0.8rem', color: '#d4af37', fontWeight: 600 }}>{p.marca?.nome || 'Palladino Profumeria'}</span>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.4' }}>{p.descricao_curta || p.fragrancia}</span>
              
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '4px' }}>
                {p.fragrancia && <span style={{ fontSize: '0.7rem', padding: '2px 8px', backgroundColor: '#f1f5f9', borderRadius: '12px', color: '#475569' }}>{p.fragrancia}</span>}
                {p.genero && <span style={{ fontSize: '0.7rem', padding: '2px 8px', backgroundColor: '#f1f5f9', borderRadius: '12px', color: '#475569' }}>{p.genero}</span>}
                {p.concentracao && <span style={{ fontSize: '0.7rem', padding: '2px 8px', backgroundColor: '#f1f5f9', borderRadius: '12px', color: '#475569' }}>{p.concentracao}</span>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <strong style={{ color: '#0f172a', fontSize: '1.1rem' }}>R$ {p.preco}</strong>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link href={`/produto/${p.slug}`} style={{ 
                    fontSize: '0.8rem', padding: '6px 12px', backgroundColor: '#d4af37', 
                    color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}>
                    Comprar <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )

      setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: productsHtml }])
      setStep('END')
      
    } catch (err) {
      setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: CHATBOT_MESSAGES.error }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = (text: string) => {
    if (!text.trim() || isLoading) return
    setMessages(prev => [...prev, { id: uuidv4(), role: 'user', content: text }])
    setInput('')
    advanceStep(step, text)
  }

  const resetChat = () => {
    setMessages([
      { id: 'init', role: 'assistant', content: CHATBOT_MESSAGES.greeting },
      { id: 'first_question', role: 'assistant', content: CHATBOT_QUESTIONS['CATEGORY'].text }
    ])
    setStep('CATEGORY')
    setCurrentQ(CHATBOT_QUESTIONS['CATEGORY'])
    setPreferences({})
    setInput('')
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#0f172a',
          color: '#d4af37', border: '2px solid #d4af37', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: isOpen ? 'none' : '0 10px 25px rgba(0,0,0,0.3)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: (isOpen || isHovered) ? 'scale(1.05)' : 'scale(1)',
          position: 'relative'
        }}
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
        {!isOpen && <span style={{ position: 'absolute', top: -5, right: -5, width: 14, height: 14, backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid #fff' }}></span>}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'absolute', bottom: '80px', right: '0', width: 'min(400px, calc(100vw - 40px))',
          height: '580px', maxHeight: 'calc(100vh - 100px)', backgroundColor: '#ffffff',
          borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex',
          flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0',
          animation: 'chatFadeIn 0.3s ease-out forwards', transformOrigin: 'bottom right'
        }}>
          {/* Header */}
          <div style={{ padding: '20px', backgroundColor: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #d4af37' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37' }}>
                <Bot size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--font-serif)', letterSpacing: '0.5px' }}>Consultor Palladino</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#cbd5e1' }}>Especialista em Perfumaria e Cosméticos</p>
              </div>
            </div>
            <button onClick={resetChat} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '5px' }} title="Recomeçar conversa">
              <RefreshCw size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f8fafc' }}>
            {messages.map((m) => (
              <div key={m.id} style={{ display: 'flex', gap: '10px', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, backgroundColor: m.role === 'user' ? '#e2e8f0' : '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.role === 'user' ? '#64748b' : '#d4af37' }}>
                  {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div style={{
                  backgroundColor: m.role === 'user' ? '#0f172a' : '#fff', color: m.role === 'user' ? '#fff' : '#334155',
                  padding: '12px 16px', borderRadius: '12px', borderTopRightRadius: m.role === 'user' ? '4px' : '12px',
                  borderTopLeftRadius: m.role === 'assistant' ? '4px' : '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                  border: m.role === 'assistant' ? '1px solid #e2e8f0' : 'none', fontSize: '0.95rem', lineHeight: '1.5', maxWidth: '85%'
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            
            {/* Chips for quick answers */}
            {step !== 'END' && !isLoading && currentQ && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px', justifyContent: 'flex-start', paddingLeft: '42px' }}>
                {currentQ.options.map(opt => (
                  <button 
                    key={opt}
                    onClick={() => handleSend(opt)}
                    style={{
                      padding: '8px 14px', borderRadius: '20px', border: '1px solid #0f172a',
                      backgroundColor: '#fff', color: '#0f172a', fontSize: '0.85rem', cursor: 'pointer',
                      transition: 'all 0.2s', fontWeight: 500
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; e.currentTarget.style.color = '#fff' }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#0f172a' }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {step === 'END' && !isLoading && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px', justifyContent: 'center' }}>
                <button onClick={resetChat} style={{ padding: '10px 18px', borderRadius: '20px', border: '1px solid #0f172a', backgroundColor: '#fff', color: '#0f172a', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500 }}>
                  Fazer nova Busca
                </button>
              </div>
            )}

            {isLoading && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37' }}><Bot size={16} /></div>
                <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                   <Loader2 size={18} className="animate-spin" color="#d4af37" />
                   <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>Analisando opções do catálogo...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes chatFadeIn {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}} />
    </div>
  )
}
