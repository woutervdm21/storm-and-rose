// Checkout page — captures contact info, delivery address, creates order + order_items
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useCart } from '../context/CartContext'
import Meta from '../components/Meta'
import { COLLECTION_POINTS, DELIVERY_METHODS, fulfillmentInfo, deliveryFeeFor, isDelivery } from '../lib/fulfillment'

const SA_PROVINCES = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
  'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape',
]

const EMPTY_FORM = {
  name: '', email: '', phone: '',
  fulfillment: '',
  shipping_line1: '', shipping_line2: '',
  shipping_city: '', shipping_province: '', shipping_postal: '',
}

export default function Checkout() {
  const { items, total, clearCart } = useCart()
  const navigate = useNavigate()

  const [form, setForm]           = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState(null)

  // top-level choice: a collection point, or 'courier' which then asks which
  // Courier Guy method. Only the method itself is stored on the order.
  const [topChoice, setTopChoice] = useState('')

  const delivering  = isDelivery(form.fulfillment)
  const deliveryFee = deliveryFeeFor(form.fulfillment)
  const grandTotal  = total + deliveryFee

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // choosing a collection point sets the stored value directly; choosing
  // courier clears it until one of the two methods is picked
  function handleTopChoice(value) {
    setTopChoice(value)
    setForm(prev => ({ ...prev, fulfillment: value === 'courier' ? '' : value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // create order row with contact + fulfillment info
    // (shipping address only applies to delivery orders)
    const toAddress = isDelivery(form.fulfillment)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name:    form.name,
        customer_email:   form.email || null,
        customer_phone:   form.phone,
        status:           'pending_payment',
        fulfillment:      form.fulfillment,
        shipping_line1:   toAddress ? form.shipping_line1 : null,
        shipping_line2:   toAddress ? (form.shipping_line2 || null) : null,
        shipping_city:    toAddress ? form.shipping_city : null,
        shipping_province: toAddress ? form.shipping_province : null,
        shipping_postal:  toAddress ? form.shipping_postal : null,
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
      // which option the customer picked, when the product offers any
      variant:    item.variant ?? null,
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
    navigate('/order-confirmation', { state: { order, total: grandTotal } })
  }

  if (items.length === 0) {
    return <p className="p-8 text-center">Your cart is empty.</p>
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-12">
      <Meta title="Checkout" noIndex />
      <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* contact info */}
        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-lg text-rose-deep dark:text-rose-dust">Contact</h2>
          <Field label="Full Name">
            <input name="name" required value={form.name} onChange={handleChange} className="input-field" />
          </Field>
          <Field label="Email Address (optional)">
            <input name="email" type="email" value={form.email} onChange={handleChange} className="input-field" />
          </Field>
          <Field label="Cellphone Number">
            <input name="phone" type="tel" required value={form.phone} onChange={handleChange} className="input-field" placeholder="072 326 4837" />
          </Field>
        </section>

        {/* fulfillment method */}
        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-lg text-rose-deep dark:text-rose-dust">Collection or Delivery</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[...COLLECTION_POINTS, { value: 'courier', label: 'Courier Guy Delivery' }].map(opt => (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-lg border px-4 py-3 text-sm text-center transition-colors
                            ${topChoice === opt.value
                              ? 'border-rose-deep bg-rose-dust/15 font-semibold text-rose-deep dark:text-rose-dust'
                              : 'border-rose-dust/40 hover:bg-rose-dust/10'}`}
              >
                <input
                  type="radio"
                  name="top_choice"
                  value={opt.value}
                  required
                  checked={topChoice === opt.value}
                  onChange={(e) => handleTopChoice(e.target.value)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>

          {/* courier method — only once Courier Guy Delivery is chosen */}
          {topChoice === 'courier' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold">Choose a delivery method:</p>
              {DELIVERY_METHODS.map(method => (
                <label
                  key={method.value}
                  className={`cursor-pointer rounded-lg border px-4 py-3 text-sm flex items-center justify-between gap-4 transition-colors
                              ${form.fulfillment === method.value
                                ? 'border-rose-deep bg-rose-dust/15 text-rose-deep dark:text-rose-dust'
                                : 'border-rose-dust/40 hover:bg-rose-dust/10'}`}
                >
                  <span>
                    <input
                      type="radio"
                      name="fulfillment"
                      value={method.value}
                      required
                      checked={form.fulfillment === method.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="font-semibold block">{method.label}</span>
                    <span className="text-xs font-normal text-gray-600 dark:text-gray-400">{method.blurb}</span>
                  </span>
                  <span className="font-semibold whitespace-nowrap">R {method.fee}</span>
                </label>
              ))}
            </div>
          )}

          {/* collection point address */}
          {form.fulfillment.startsWith('collection') && (
            <div className="border border-rose-dust/30 bg-rose-dust/10 rounded-lg px-4 py-3 text-sm">
              <p className="font-semibold mb-1">Collect your order from:</p>
              {fulfillmentInfo(form.fulfillment).address.map(line => (
                <p key={line} className="text-gray-600 dark:text-gray-300">{line}</p>
              ))}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                We'll contact you when your order is ready for collection.
              </p>
            </div>
          )}
        </section>

        {/* delivery address — only for delivery orders */}
        {delivering && (
        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-lg text-rose-deep dark:text-rose-dust">Delivery Address</h2>
          {form.fulfillment === 'delivery_locker' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
              We use your address to find your nearest Pudo locker, and confirm which one before we ship.
            </p>
          )}
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
        )}

        {/* order summary */}
        <div className="border border-rose-dust/30 rounded-lg p-4 text-sm space-y-1">
          {items.map(item => (
            <div key={item.id} className="flex justify-between">
              <span>{item.name} × {item.qty}</span>
              <span>R {(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
          {delivering && (
            <div className="flex justify-between">
              <span>{fulfillmentInfo(form.fulfillment).short}</span>
              <span>R {deliveryFee.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold pt-2 border-t border-rose-dust/20 mt-2">
            <span>Total</span>
            <span>R {grandTotal.toFixed(2)}</span>
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
