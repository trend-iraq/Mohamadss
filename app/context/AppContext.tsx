'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface CartItem {
  productId: string
  name: string
  price: number
  image: string
  quantity: number
  stock: number
}

interface AppContextType {
  user: User | null
  cart: CartItem[]
  cartCount: number
  cartTotal: number
  loadingUser: boolean
  setUser: (u: User | null) => void
  addToCart: (item: Omit<CartItem, 'quantity'>) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, qty: number) => void
  clearCart: () => void
  logout: () => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.user) setUser(d.user) })
      .catch(() => {})
      .finally(() => setLoadingUser(false))

    const saved = localStorage.getItem('cart')
    if (saved) {
      try { setCart(JSON.parse(saved)) } catch {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart))
  }, [cart])

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === item.productId)
      if (existing) {
        return prev.map(i =>
          i.productId === item.productId
            ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) }
            : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId))
  }

  const updateQuantity = (productId: string, qty: number) => {
    if (qty < 1) return removeFromCart(productId)
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, quantity: Math.min(qty, i.stock) } : i))
  }

  const clearCart = () => setCart([])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    clearCart()
    window.location.href = '/'
  }

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)

  return (
    <AppContext.Provider value={{
      user, cart, cartCount, cartTotal, loadingUser,
      setUser, addToCart, removeFromCart, updateQuantity, clearCart, logout
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
