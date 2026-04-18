// Checkout page — captures contact info, delivery address, creates order + order_items
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useCart } from '../context/CartContext'

const SA_PROVINCES = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
  'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape',
]

const EMPTY_FORM = {
  name: '', email: '', phone: '',
  shipping_line1: '', shipping_line2: '',
  shipping_city: '', shipping_province: '', shipping_postal: '',
}

export default function Checkout() {
  const { items, total, clearCart } = useCart()
  const navigate = useNavigate()

  const [form, setForm]           = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState(null)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // create order row with contact + shipping info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name:    form.name,
        customer_email:   form.email,
        customer_phone:   form.phone,
        status:           'pending_payment',
        shipping_line1:   form.shipping_line1,
        shipping_line2:   form.shipping_line2 || null,
        shipping_city:    form.shipping_city,
        shipping_province: form.shipping_province,
        shipping_postal:  form.shipping_postal,
      })
      .select()
      .single()

    if (orderError) {
      toast.error('Could not place order. Please try again.')
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
      toast.error('Order created but items failed to save. Please contact us.')
      setError('Order created but items failed to save. Please contact us.')
      setSubmitting(false)
      return
    }

    // success — clear cart and go to confirmation
    toast.success('Order placed successfully!')
    clearCart()
    navigate('/order-confirmation', { state: { order, total } })
  }

  if (items.length === 0) {
    return <p className="p-8 text-center">Your cart is empty.</p>
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* contact info */}
        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-lg text-rose-deep dark:text-rose-dust">Contact</h2>
          <Field label="Full Name">
            <input name="name" required value={form.name} onChange={handleChange} className="input-field" />
          </Field>
          <Field label="Email Address">
            <input name="email" type="email" required value={form.email} onChange={handleChange} className="input-field" />
          </Field>
          <Field label="Cellphone Number">
            <input name="phone" type="tel" required value={form.phone} onChange={handleChange} className="input-field" placeholder="072 326 4837" />
          </Field>
        </section>

        {/* delivery address */}
        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-lg text-rose-deep dark:text-rose-dust">Delivery Address</h2>
          <Field label="Street Address">
            <input name="shipping_line1" required value={form.shipping_line1} onChange={handleChange} className="input-field" placeholder="123 Main Street" />
          </Field>
          <Field label="Suburb / Unit (optional)">
            <input name="shipping_line2" value={form.shipping_line2} onChange={handleChange} className="input-field" placeholder="Apt 4B, Thornhill Estate" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City">
              <input name="shipping_city" required value={form.shipping_city} onChange={handleChange} className="input-field" />
            </Field>
            <Field label="Postal Code">
              <input name="shipping_postal" required value={form.shipping_postal} onChange={handleChange} className="input-field" />
            </Field>
          </div>
          <Field label="Province">
            <select name="shipping_province" required value={form.shipping_province} onChange={handleChange} className="input-field">
              <option value="">Select province…</option>
              {SA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </section>

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
          className="btn-primary py-3"
        >
          {submitting ? 'Placing Order...' : 'Place Order'}
        </button>
      </form>
    </main>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">{label}</label>
      {children}
    </div>
  )
}
