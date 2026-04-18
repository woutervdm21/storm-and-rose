// Checkout page — captures name/email, creates order + order_items in Supabase, shows EFT instructions
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../context/CartContext'

export default function Checkout() {
  const { items, total, clearCart } = useCart()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', email: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // create order row
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ customer_name: form.name, customer_email: form.email, status: 'pending_payment' })
      .select()
      .single()

    if (orderError) {
      setError('Could not place order. Please try again.')
      setSubmitting(false)
      return
    }

    // create one order_items row per cart item
    const orderItems = items.map(item => ({
      order_id:   order.id,
      product_id: item.id,
      quantity:   item.qty,
      unit_price: item.price,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)

    if (itemsError) {
      setError('Order created but items failed to save. Please contact us.')
      setSubmitting(false)
      return
    }

    // success — clear cart and go to confirmation
    clearCart()
    navigate('/order-confirmation', { state: { order, total } })
  }

  if (items.length === 0) {
    return <p className="p-8 text-center">Your cart is empty.</p>
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-semibold mb-1">Full Name</label>
          <input
            name="name"
            required
            value={form.name}
            onChange={handleChange}
            className="w-full border border-rose-dust/50 rounded-lg px-4 py-2 bg-cream dark:bg-navy focus:outline-none focus:border-rose-deep"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Email Address</label>
          <input
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full border border-rose-dust/50 rounded-lg px-4 py-2 bg-cream dark:bg-navy focus:outline-none focus:border-rose-deep"
          />
        </div>

        {/* order summary */}
        <div className="border border-rose-dust/30 rounded-lg p-4 text-sm space-y-1">
          {items.map(item => (
            <div key={item.id} className="flex justify-between">
              <span>{item.name} × {item.qty}</span>
              <span>R {(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between font-semibold pt-2 border-t border-rose-dust/20 mt-2">
            <span>Total</span>
            <span>R {total.toFixed(2)}</span>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-rose-deep hover:bg-rose-mid disabled:opacity-50 text-cream font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {submitting ? 'Placing Order...' : 'Place Order'}
        </button>
      </form>
    </main>
  )
}
