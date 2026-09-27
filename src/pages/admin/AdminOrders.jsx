// Admin orders page — view, filter, and update order statuses; deducts stock on ship; books the courier
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { fulfillmentInfo, orderDeliveryFee } from '../../lib/fulfillment'
import LockerPicker from '../../components/LockerPicker'
import { courier, trackingUrl, statusLabel, PARCELS, DEFAULT_PARCEL, COLLECTION_POINTS, DEFAULT_COLLECTION } from '../../lib/courier'

// visual config per status
const STATUS_CONFIG = {
  pending_payment: {
    label: 'Pending Payment',
    active:   'bg-amber-400 text-white',
    inactive: 'border border-amber-400 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-400/10',
  },
  paid: {
    label: 'Paid',
    active:   'bg-emerald-500 text-white',
    inactive: 'border border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10',
  },
  shipped: {
    label: 'Shipped',
    active:   'bg-blue-500 text-white',
    inactive: 'border border-blue-400 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10',
  },
  delivered: {
    label: 'Delivered',
    active:   'bg-violet-500 text-white',
    inactive: 'border border-violet-400 text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10',
  },
}

// stock comes off once, when an order first leaves pending/paid
const HOLDS_STOCK = ['pending_payment', 'paid']

// filter options — 'active' is the default (pending_payment + paid)
const FILTERS = [
  { key: 'active',          label: 'Active' },
  { key: 'pending_payment', label: 'Pending Payment' },
  { key: 'paid',            label: 'Paid' },
  { key: 'shipped',         label: 'Shipped' },
  { key: 'delivered',       label: 'Delivered' },
  { key: 'all',             label: 'All' },
]

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('active')
  // booked this visit — kept on screen so the label can still be printed
  const [justBooked, setJustBooked] = useState([])

  useEffect(() => { loadOrders().then(refreshTracking) }, [])

  async function loadOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(quantity, unit_price, product_id, variant, products(name))')
      .order('created_at', { ascending: false })
    setOrders(data ?? [])
  }

  // ask Courier Guy about shipped orders; delivered ones move to Delivered
  async function refreshTracking() {
    const { data } = await courier('track', {})
    const updated = data?.updated ?? []
    if (!updated.length) return
    setOrders(prev => prev.map(o => {
      const u = updated.find(x => x.id === o.id)
      return u ? { ...o, ...u } : o
    }))
    const delivered = updated.filter(u => u.status === 'delivered').length
    if (delivered) toast.success(`${delivered} order${delivered > 1 ? 's' : ''} delivered`)
  }

  async function handleStatusChange(order, newStatus) {
    if (order.status === newStatus) return

    // deduct stock when an order first goes out (shipped, or straight to delivered)
    if (HOLDS_STOCK.includes(order.status) && !HOLDS_STOCK.includes(newStatus)) {
      for (const item of order.order_items ?? []) {
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single()

        if (product) {
          const newStock = Math.max(0, product.stock - item.quantity)
          await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id)
        }
      }
    }

    await supabase.from('orders').update({ status: newStatus }).eq('id', order.id)

    const label = STATUS_CONFIG[newStatus].label
    toast.success(`Order #${order.id.slice(0, 8).toUpperCase()} marked as ${label}`)

    // optimistic update
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o))
  }

  // merge courier fields into one order after a booking changes them
  function patchOrder(id, fields) {
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, ...fields } : o)))
  }

  // apply active filter
  const visible = orders.filter(o => {
    if (filter === 'active') return o.status === 'pending_payment' || o.status === 'paid' || justBooked.includes(o.id)
    if (filter === 'all')    return true
    return o.status === filter
  })

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust mb-6">Orders</h1>

      {/* filter bar */}
      <div className="flex flex-wrap gap-2 mb-8">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-sm px-4 py-1.5 rounded-full transition-colors ${
              filter === f.key
                ? 'bg-rose-deep text-cream'
                : 'border border-rose-dust/40 text-navy dark:text-cream hover:bg-rose-dust/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 && <p className="text-gray-500">No orders found.</p>}

      <div className="space-y-4">
        {visible.map(order => {
          // items subtotal + the courier fee for the chosen delivery method
          const subtotal = order.order_items?.reduce(
            (sum, item) => sum + item.quantity * item.unit_price, 0
          ) ?? 0
          const deliveryFee = orderDeliveryFee(order)
          const orderTotal = subtotal + deliveryFee

          return (
            <div key={order.id} className="border border-rose-dust/30 rounded-xl p-5">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                {/* customer + shipping info */}
                <div>
                  <p className="font-semibold">{order.customer_name}</p>
                  {order.customer_email && (
                    <p className="text-sm text-gray-500">{order.customer_email}</p>
                  )}
                  {order.customer_phone && (
                    <p className="text-sm text-gray-500">{order.customer_phone}</p>
                  )}
                  <p className="text-sm text-gray-400 mt-1">
                    {new Date(order.created_at).toLocaleDateString()} · #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className={`text-xs font-semibold mt-1 inline-block px-2 py-0.5 rounded-full ${
                    order.fulfillment?.startsWith('collection')
                      ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                      : 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                  }`}>
                    {fulfillmentInfo(order.fulfillment).short}
                  </p>
                  {/* how they paid — a card order that says Paid was confirmed by
                      Yoco's webhook, an EFT one by somebody checking the bank */}
                  <p className={`text-xs font-semibold mt-1 ml-2 inline-block px-2 py-0.5 rounded-full ${
                    order.payment_method === 'yoco'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300'
                  }`}>
                    {order.payment_method === 'yoco' ? 'Card · Yoco' : 'EFT'}
                  </p>
                  {order.shipping_line1 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {order.shipping_line1}{order.shipping_line2 ? `, ${order.shipping_line2}` : ''}, {order.shipping_city}, {order.shipping_province} {order.shipping_postal}
                    </p>
                  )}
                  {order.pudo_locker_name && (
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="font-medium">Locker:</span> {order.pudo_locker_name} · {order.pudo_locker_address}
                    </p>
                  )}
                </div>

                {/* 3-button status selector */}
                <div className="flex gap-2">
                  {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(order, status)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        order.status === status ? cfg.active : cfg.inactive
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* line items */}
              <ul className="text-sm space-y-1 border-t border-rose-dust/20 pt-3">
                {order.order_items?.map((item, i) => (
                  <li key={i} className="flex justify-between">
                    <span>
                      {item.products?.name}
                      {item.variant && <span className="text-rose-mid"> — {item.variant}</span>}
                      {' '}× {item.quantity}
                    </span>
                    <span>R {(item.quantity * item.unit_price).toFixed(2)}</span>
                  </li>
                ))}
                {deliveryFee > 0 && (
                  <li className="flex justify-between">
                    <span>Delivery (courier)</span>
                    <span>R {deliveryFee.toFixed(2)}</span>
                  </li>
                )}
                <li className="flex justify-between font-semibold pt-1 border-t border-rose-dust/10">
                  <span>Total</span>
                  <span>R {orderTotal.toFixed(2)}</span>
                </li>
              </ul>

              {/* courier booking — door-to-door and locker orders only */}
              {order.fulfillment?.startsWith('delivery') && (
                <CourierPanel
                  order={order}
                  onChange={fields => patchOrder(order.id, fields)}
                  // a booked parcel is on its way — same as clicking Shipped, stock included
                  onBooked={() => { setJustBooked(prev => [...prev, order.id]); handleStatusChange(order, 'shipped') }}
                />
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}

// Book The Courier Guy for one order: pick a box, see the real price, confirm.
// Nothing is booked (or billed) until "Confirm booking" is clicked.
function CourierPanel({ order, onChange, onBooked }) {
  const [open, setOpen]       = useState(false)
  const [parcel, setParcel]   = useState(DEFAULT_PARCEL)
  const [from, setFrom]       = useState(DEFAULT_COLLECTION)
  // locker orders go Locker to Locker: the Pudo locker we drop the parcel at,
  // remembered in this browser so it only has to be picked once
  const [dropOff, setDropOff] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dropOffLocker')) } catch { return null }
  })
  const isLocker = order.fulfillment === 'delivery_locker'
  const [offer, setOffer]     = useState(null)
  const [busy, setBusy]       = useState(false)
  const [problem, setProblem] = useState(null)

  // free quote whenever the panel opens or the box, sender or drop-off locker changes
  useEffect(() => {
    if (!open) return
    let stale = false
    setOffer(null)
    setProblem(null)
    if (isLocker && !dropOff) return   // nothing to price until the drop-off locker is chosen
    setBusy(true)
    courier('quote', { order_id: order.id, parcel, from, drop_off: dropOff?.id }).then(({ data, error }) => {
      if (stale) return
      setBusy(false)
      if (error) setProblem(error)
      else setOffer(data)
    })
    return () => { stale = true }
  }, [open, parcel, from, dropOff, isLocker, order.id])

  function chooseDropOff(locker) {
    setDropOff(locker)
    try {
      if (locker) localStorage.setItem('dropOffLocker', JSON.stringify(locker))
      else localStorage.removeItem('dropOffLocker')
    } catch { /* private window — just not remembered */ }
  }

  async function book() {
    const place = isLocker ? `drop-off at ${dropOff.name}` : `from ${COLLECTION_POINTS.find(p => p.key === from).label}`
    if (!confirm(`Book Courier Guy ${offer.service_name}, ${place}, for R ${offer.rate.toFixed(2)}? This is billed to your account.`)) return
    setBusy(true)
    setProblem(null)
    const { data, error } = await courier('book', { order_id: order.id, parcel, from, drop_off: dropOff?.id, confirmed_rate: offer.rate })
    setBusy(false)

    if (error) {
      setProblem(error)
      if (data?.rate) setOffer(data)                                  // price moved — show the new one
      if (data?.unconfirmed) onChange({ courier_booked_at: new Date().toISOString() })
      return
    }
    toast.success(`Courier booked · tracking ${data.tracking_ref}`)
    if (isLocker) toast.info(`Drop the parcel at ${dropOff.name}`, { duration: 10000 })
    if (data.email_sent) toast.success(`Tracking emailed to ${order.customer_email}`)
    else toast.warning('Booked, but the tracking email did not send — pass the number on yourself.')
    onChange({
      courier_booked_at:    new Date().toISOString(),
      courier_shipment_id:  data.shipment_id,
      courier_tracking_ref: data.tracking_ref,
      courier_cost:         data.rate,
    })
    setOpen(false)
    onBooked()
  }

  async function printLabel() {
    setBusy(true)
    const { data, error } = await courier('label', { order_id: order.id })
    setBusy(false)
    if (error) toast.error(error)
    else window.open(data.url, '_blank', 'noopener')
  }

  // only after checking the portal: clears a booking that never completed
  async function release() {
    if (!confirm('Only do this if the Courier Guy portal shows NO booking for this order. Continue?')) return
    const { error } = await courier('release', { order_id: order.id })
    if (error) toast.error(error)
    else onChange({ courier_booked_at: null })
  }

  const box = 'mt-4 pt-3 border-t border-rose-dust/20 text-sm'
  const fmtDay = (iso) => new Date(iso).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })

  // booked — tracking, label
  if (order.courier_shipment_id) {
    return (
      <div className={`${box} flex flex-wrap items-center gap-x-4 gap-y-1`}>
        <span className="font-medium text-emerald-600 dark:text-emerald-400">✓ Courier booked</span>
        {order.courier_tracking_ref && (
          <a href={trackingUrl(order.courier_tracking_ref)} target="_blank" rel="noopener noreferrer"
             className="text-rose-mid hover:underline">
            Tracking {order.courier_tracking_ref}
          </a>
        )}
        {order.courier_status && (
          <span className="text-gray-500" title={order.courier_checked_at ? `Checked ${new Date(order.courier_checked_at).toLocaleString()}` : undefined}>
            {statusLabel(order.courier_status)}
          </span>
        )}
        {order.courier_cost != null && <span className="text-gray-500">R {Number(order.courier_cost).toFixed(2)}</span>}
        <button onClick={printLabel} disabled={busy} className="text-rose-mid hover:underline disabled:opacity-50">
          {busy ? 'Fetching label…' : 'Print label'}
        </button>
      </div>
    )
  }

  // a booking started but never confirmed
  if (order.courier_booked_at) {
    return (
      <div className={`${box} text-amber-700 dark:text-amber-400`}>
        A booking was started {new Date(order.courier_booked_at).toLocaleString()} but not confirmed.
        Check the Courier Guy portal for this order.{' '}
        <button onClick={release} className="underline">Nothing was booked — let me try again</button>
      </div>
    )
  }

  // door-to-door, or a locker order placed after the locker picker went live —
  // older locker orders never recorded which locker
  const lockerChosen = order.fulfillment === 'delivery_locker' && order.pudo_locker_id
  if (order.fulfillment !== 'delivery_door' && !lockerChosen) {
    return (
      <p className={`${box} text-gray-500`}>
        {order.fulfillment === 'delivery_locker' ? 'Pudo locker order from before the locker picker' : 'Older delivery order'} — book it in the Courier Guy portal.
      </p>
    )
  }

  // don't send what hasn't been paid for
  if (order.status === 'pending_payment') {
    return <p className={`${box} text-gray-500`}>Courier can be booked once the order is paid.</p>
  }

  if (!open) {
    return (
      <div className={box}>
        <button onClick={() => setOpen(true)} className="text-rose-mid hover:underline font-medium">
          Book Courier Guy →
        </button>
      </div>
    )
  }

  return (
    <div className={`${box} space-y-3`}>
      {/* drop-off locker — locker orders only */}
      {isLocker && (
        <div className="flex flex-wrap items-start gap-2">
          <span className="text-xs text-gray-500 w-24 pt-2">Drop off at</span>
          <div className="flex-1 min-w-[16rem]">
            <LockerPicker value={dropOff} onChange={chooseDropOff} label="Our drop-off locker" />
          </div>
        </div>
      )}

      {/* collection point, or who is sending a locker parcel */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 w-24">{isLocker ? 'Sender' : 'Collect from'}</span>
        {COLLECTION_POINTS.map(p => (
          <button
            key={p.key}
            onClick={() => setFrom(p.key)}
            disabled={busy}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              from === p.key
                ? 'border-rose-deep bg-rose-deep text-cream'
                : 'border-rose-dust/40 hover:bg-rose-dust/10'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* box size */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 w-24">Box</span>
        {PARCELS.map(p => (
          <button
            key={p.key}
            onClick={() => setParcel(p.key)}
            disabled={busy}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              parcel === p.key
                ? 'border-rose-deep bg-rose-deep text-cream'
                : 'border-rose-dust/40 hover:bg-rose-dust/10'
            }`}
          >
            {p.label} <span className="opacity-70">· {p.detail}</span>
          </button>
        ))}
      </div>

      {/* quote */}
      {busy && !offer && <p className="text-gray-500">Getting a price…</p>}
      {offer && (
        <p>
          <strong>{offer.service_name} · R {offer.rate.toFixed(2)}</strong>
          <span className="text-gray-500">
            {' '}— {isLocker ? '' : `collected ${fmtDay(offer.collection_date)}, `}delivered {fmtDay(offer.delivery_from)}–{fmtDay(offer.delivery_to)}
          </span>
        </p>
      )}
      {problem && <p className="text-red-500">{problem}</p>}

      <div className="flex gap-3">
        <button onClick={book} disabled={busy || !offer} className="btn-primary !py-2 !px-5">
          {busy && offer ? 'Booking…' : offer ? `Confirm booking — R ${offer.rate.toFixed(2)}` : 'Confirm booking'}
        </button>
        <button onClick={() => setOpen(false)} disabled={busy} className="btn-secondary !py-2 !px-5">Cancel</button>
      </div>
    </div>
  )
}
