import type { Metadata } from 'next'
import { Cormorant_Garamond, Montserrat } from 'next/font/google'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { Chatbot } from '@/components/layout/Chatbot'
import './globals.css'

const cormorant = Cormorant_Garamond({ 
  subsets: ['latin'], 
  weight: ['300', '400', '600'], 
  style: ['normal', 'italic'],
  variable: '--font-serif',
})

const montserrat = Montserrat({ 
  subsets: ['latin'], 
  weight: ['200', '300', '400', '500'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'PALLADINO PROFUMERIA | Alta Profumeria Italiana',
  description: 'Descubra a Palladino Profumeria, a essência do luxo invisível. Alta perfumaria italiana feita para transcender o tempo.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${montserrat.variable}`}>
      <body>
        {children}
        <CartDrawer />
        <Chatbot />
      </body>
    </html>
  )
}
