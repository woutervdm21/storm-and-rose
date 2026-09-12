import { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext()

export function CartProvider({ children }) {
  // load cart from localStorage on first render
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cart')) ?? []
    } catch {
      return []
    }
  })

  // persist cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items))
  }, [items])

  // A cart line is a product *and* the variant chosen, so two colours of the
  // same candle sit on separate lines. Items with no variant key on id alone,
  // which is also what carts saved before variants existed look like.
  const lineKey = (item) => (item.variant ? `${item.id}::${item.variant}` : item.id)

  // add a product or increment quantity if that exact line is already in cart
  function addItem(product, variant = null) {
    const line = { ...product, variant: variant ?? null }
    setItems(prev => {
      const existing = prev.find(i => lineKey(i) === lineKey(line))
      if (existing) {
        return prev.map(i => lineKey(i) === lineKey(line) ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { ...line, qty: 1 }]
    })
  }

  // remove one cart line entirely
  function removeItem(key) {
    setItems(prev => prev.filter(i => lineKey(i) !== key))
  }

  // set exact quantity; remove if qty reaches 0
  function updateQty(key, qty) {
    if (qty <= 0) return removeItem(key)
    setItems(prev => prev.map(i => lineKey(i) === key ? { ...i, qty } : i))
  }

  function clearCart() {
    setItems([])
  }

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, total, lineKey }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
