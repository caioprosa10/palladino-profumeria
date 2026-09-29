import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Product {
  id: string
  nome: string
  slug: string
  preco: number
  descricao_curta: string | null
  imagens: { url: string }[]
  atacado: boolean
}

export interface CartItem {
  id: string
  produto: Product
  quantidade: number
}

export interface Order {
  id: string
  date: string
  status: string
  total: number
  items: { name: string; qty: number; price: number }[]
}

export interface FreightOption {
  id: number
  name: string
  price: string
  custom_delivery_time: number
  error?: string
}

interface CartState {
  cart: CartItem[]
  orders: Order[]
  isDrawerOpen: boolean
  activeTab: 'cart' | 'orders'
  selectedFreight: number
  selectedFreightName: string
  selectedDeliveryTime: number
  /** Serviço escolhido e CEP usados pelo servidor para recalcular o frete. */
  selectedFreightId: number
  cepDestino: string
  shippingOptions: FreightOption[]
  
  
  openDrawer: () => void
  closeDrawer: () => void
  setTab: (tab: 'cart' | 'orders') => void
  
  addToCart: (produto: Product) => void
  removeFromCart: (itemId: string) => void
  updateQuantity: (itemId: string, qtde: number) => void
  
  setFreight: (value: number, name?: string, time?: number, id?: number) => void
  setCepDestino: (cep: string) => void
  setShippingOptions: (options: FreightOption[]) => void
  clearCart: () => void
  addOrder: (order: Order) => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      orders: [],
      isDrawerOpen: false,
      activeTab: 'cart',
      selectedFreight: 0,
      selectedFreightName: '',
      selectedDeliveryTime: 0,
      selectedFreightId: 0,
      cepDestino: '',
      shippingOptions: [],
      
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      setTab: (tab) => set({ activeTab: tab }),
      
      addToCart: (produto) => set((state) => {
        const existingItem = state.cart.find((item) => item.produto.id === produto.id)
        if (existingItem) {
          return {
            cart: state.cart.map((item) =>
              item.produto.id === produto.id
                ? { ...item, quantidade: item.quantidade + 1 }
                : item
            ),
            isDrawerOpen: true,
            activeTab: 'cart'
          }
        }
        return {
          cart: [...state.cart, { id: 'item-' + Date.now(), produto, quantidade: 1 }],
          isDrawerOpen: true,
          activeTab: 'cart'
        }
      }),
      
      removeFromCart: (itemId) => set((state) => ({
        cart: state.cart.filter((item) => item.id !== itemId)
      })),
      
      updateQuantity: (itemId, qtde) => set((state) => ({
        cart: state.cart.map((item) =>
          item.id === itemId ? { ...item, quantidade: qtde } : item
        )
      })),
      
      setFreight: (value, name = '', time = 0, id = 0) => set({ selectedFreight: value, selectedFreightName: name, selectedDeliveryTime: time, selectedFreightId: id }),

      setCepDestino: (cep) => set({ cepDestino: cep.replace(/\D/g, '') }),
      
      setShippingOptions: (options) => set({ shippingOptions: options }),
      
      clearCart: () => set({ cart: [], selectedFreight: 0, selectedFreightName: '', selectedDeliveryTime: 0, selectedFreightId: 0, cepDestino: '', shippingOptions: [] }),
      
      addOrder: (order) => set((state) => ({
        orders: [order, ...state.orders]
      }))
    }),
    {
      name: 'aura_cart_storage',
      partialize: (state) => ({ cart: state.cart, orders: state.orders })
    }
  )
)
