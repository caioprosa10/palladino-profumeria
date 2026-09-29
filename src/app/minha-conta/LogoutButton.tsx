"use client"

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <button 
      onClick={handleLogout} 
      className="btn btn-secondary" 
      disabled={loading}
      style={{ opacity: loading ? 0.7 : 1 }}
    >
      {loading ? 'Saindo...' : 'Sair da Conta'}
    </button>
  )
}
