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

const PAYMENT_METHODS = [
  {
    value: 'card',
    icon:  CardIcon,
    label: 'Card — pay now',
    blurb: 'Secure card payment through Yoco. Your order is confirmed immediately.',
  },
  {
    value: 'eft',
    icon:  BankIcon,
    label: 'EFT — pay by bank transfer',
    blurb: "We'll show you our banking details. Orders ship once payment reflects.",
  },
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
  const [payment, setPayment]     = useState('card')
  const [submitting, setSubmitting] = useState(false)
  // set while the browser is on its way to Yoco — the cart is already empty by
  // then, and the empty-cart notice must not flash up in the gap
  const [redirecting, setRedirecting] = useState(false)
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
    //
    // The customer is not signed in, and anonymous visitors are allowed to
    // write an order but not to read one — otherwise anyone could pull up
    // every customer's details. So we mint the id here and keep our own copy
    // of the row for the confirmation page, rather than asking for it back.
    const toAddress = isDelivery(form.fulfillment)
    const order = {
      id:               crypto.randomUUID(),
      customer_name:    form.name,
      customer_email:   form.email,
      customer_phone:   form.phone,
      status:           'pending_payment',
      payment_method:   payment === 'card' ? 'yoco' : 'eft',
      fulfillment:      form.fulfillment,
      shipping_line1:   toAddress ? form.shipping_line1 : null,
      shipping_line2:   toAddress ? (form.shipping_line2 || null) : null,
      shipping_city:    toAddress ? form.shipping_city : null,
      shipping_province: toAddress ? form.shipping_province : null,
      shipping_postal:  toAddress ? form.shipping_postal : null,
    }

    const { error: orderError } = await supabase.from('orders').insert(order)

    if (orderError) {
      // the customer gets the friendly line; the real cause goes to the
      // console, so a failure is diagnosable without guessing
      console.error('Order insert failed', orderError)
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
      console.error('Order items insert failed', itemsError)
      toast.error('Order created but items failed to save. Please contact us.')
      setError('Order created but items failed to save. Please contact us.')
      setSubmitting(false)
      return
    }

    // card payments hand off to Yoco. The order stays pending_payment until
    // the yoco-webhook function confirms it — this redirect is not proof of
    // anything, it just takes the customer to the card form.
    if (payment === 'card') {
      const { data, error: payError } = await supabase.functions.invoke(
        'yoco-create-checkout', { body: { order_id: order.id } },
      )

      if (payError || !data?.redirectUrl) {
        // the order is already saved, so fall back to EFT rather than lose it
        console.error('Could not create Yoco checkout', payError, data)
        toast.error('Card payment is unavailable right now — please pay by EFT.')
        clearCart()
        navigate('/order-confirmation', { state: { order, total: grandTotal } })
        return
      }

      setRedirecting(true)
      clearCart()
      window.location.href = data.redirectUrl
      return
    }

    // success — clear cart and go to confirmation
    toast.success('Order placed successfully!')
    clearCart()
    navigate('/order-confirmation', { state: { order, total: grandTotal } })
  }

  // checked before the empty-cart guard, because clearing the cart is what puts
  // us here — the browser is mid-navigation to Yoco
  if (redirecting) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <Meta title="Taking you to payment" noIndex />
        <h1 className="font-serif text-2xl text-rose-deep dark:text-rose-dust mb-3">
          Taking you to secure payment…
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your order is saved. If this page does not move on its own, check your
          connection and try again from your order confirmation.
        </p>
      </main>
    )
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
          <Field label="Email Address">
            <input name="email" type="email" required value={form.email} onChange={handleChange} className="input-field" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Your order confirmation and payment receipt go here.
            </p>
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

        {/* payment method */}
        <section className="flex flex-col gap-3">
          <h2 className="font-serif text-lg text-rose-deep dark:text-rose-dust">Payment</h2>
          {PAYMENT_METHODS.map(method => {
            const Icon     = method.icon
            const selected = payment === method.value
            return (
              <label
                key={method.value}
                className={`cursor-pointer rounded-lg border px-4 py-3 text-sm flex items-center gap-4 transition-colors
                            ${selected
                              ? 'border-rose-deep bg-rose-dust/15 text-rose-deep dark:text-rose-dust'
                              : 'border-rose-dust/40 hover:bg-rose-dust/10'}`}
              >
                <input
                  type="radio"
                  name="payment"
                  value={method.value}
                  checked={selected}
                  onChange={(e) => setPayment(e.target.value)}
                  className="sr-only"
                />
                {/* the icon carries the selected tint; unselected sits back a shade */}
                <Icon className={`w-7 h-7 shrink-0 transition-colors
                                  ${selected ? 'text-rose-deep dark:text-rose-dust' : 'text-rose-mid/60'}`} />
                <span className="min-w-0">
                  <span className="font-semibold block">{method.label}</span>
                  <span className="text-xs font-normal text-gray-600 dark:text-gray-400">{method.blurb}</span>
                </span>
              </label>
            )
          })}
        </section>

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
          {submitting
            ? 'Placing Order...'
            : payment === 'card' ? `Pay R ${grandTotal.toFixed(2)}` : 'Place Order'}
        </button>
      </form>
    </main>
  )
}

// Payment icons — drawn inline rather than pulled from an icon set, so they
// inherit the brand colour and stay a single stroke weight with everything
// else on the page. currentColor lets the label above tint them.

function CardIcon({ className }) {
  return (
    <svg viewBox="0 0 32 24" fill="none" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="22" rx="4"
            stroke="currentColor" strokeWidth="1.5" />
      {/* magnetic stripe */}
      <path d="M1 8h30" stroke="currentColor" strokeWidth="1.5" />
      {/* the two dots read as a card number without spelling one out */}
      <path d="M6 16.5h5M14 16.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function BankIcon({ className }) {
  return (
    <svg viewBox="0 0 32 24" fill="none" className={className} aria-hidden="true">
      {/* roof */}
      <path d="M2.5 9 16 2l13.5 7" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
      {/* columns */}
      <path d="M7 12v7M13 12v7M19 12v7M25 12v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* floor */}
      <path d="M3.5 22h25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
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
