// Admin orders page — view, filter, and update order statuses; deducts stock on ship
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'

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
}

// filter options — 'active' is the default (pending_payment + paid)
const FILTERS = [
  { key: 'active',          label: 'Active' },
  { key: 'pending_payment', label: 'Pending Payment' },
  { key: 'paid',            label: 'Paid' },
  { key: 'shipped',         label: 'Shipped' },
  { key: 'all',             label: 'All' },
]

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('active')

  useEffect(() => { loadOrders() }, [])

  async function loadOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(quantity, unit_price, product_id, products(name))')
      .order('created_at', { ascending: false })
    setOrders(data ?? [])
  }

  async function handleStatusChange(order, newStatus) {
    if (order.status === newStatus) return

    // deduct stock when transitioning to shipped
    if (newStatus === 'shipped') {
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

  // apply active filter
  const visible = orders.filter(o => {
    if (filter === 'active') return o.status === 'pending_payment' || o.status === 'paid'
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
          const orderTotal = order.order_items?.reduce(
            (sum, item) => sum + item.quantity * item.unit_price, 0
          ) ?? 0

          return (
            <div key={order.id} className="border border-rose-dust/30 rounded-xl p-5">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                {/* customer + shipping info */}
                <div>
                  <p className="font-semibold">{order.customer_name}</p>
                  <p className="text-sm text-gray-500">{order.customer_email}</p>
                  {order.customer_phone && (
                    <p className="text-sm text-gray-500">{order.customer_phone}</p>
                  )}
                  <p className="text-sm text-gray-400 mt-1">
                    {new Date(order.created_at).toLocaleDateString()} · #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  {order.shipping_line1 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {order.shipping_line1}{order.shipping_line2 ? `, ${order.shipping_line2}` : ''}, {order.shipping_city}, {order.shipping_province} {order.shipping_postal}
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
                    <span>{item.products?.name} × {item.quantity}</span>
                    <span>R {(item.quantity * item.unit_price).toFixed(2)}</span>
                  </li>
                ))}
                <li className="flex justify-between font-semibold pt-1 border-t border-rose-dust/10">
                  <span>Total</span>
                  <span>R {orderTotal.toFixed(2)}</span>
                </li>
              </ul>
            </div>
          )
        })}
      </div>
    </main>
  )
}
