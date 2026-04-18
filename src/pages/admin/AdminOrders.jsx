// Admin orders page — view all orders and update their status
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const STATUSES = ['pending_payment', 'paid', 'shipped']

export default function AdminOrders() {
  const [orders, setOrders] = useState([])

  useEffect(() => { loadOrders() }, [])

  async function loadOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(quantity, unit_price, products(name))')
      .order('created_at', { ascending: false })
    setOrders(data ?? [])
  }

  async function handleStatusChange(id, status) {
    await supabase.from('orders').update({ status }).eq('id', id)
    // optimistic update
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust mb-8">Orders</h1>

      {orders.length === 0 && <p className="text-gray-500">No orders yet.</p>}

      <div className="space-y-4">
        {orders.map(order => {
          const orderTotal = order.order_items?.reduce(
            (sum, item) => sum + item.quantity * item.unit_price, 0
          ) ?? 0

          return (
            <div key={order.id} className="border border-rose-dust/30 rounded-xl p-5">
              <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                <div>
                  <p className="font-semibold">{order.customer_name}</p>
                  <p className="text-sm text-gray-500">{order.customer_email}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {new Date(order.created_at).toLocaleDateString()} · #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>

                {/* status selector */}
                <select
                  value={order.status}
                  onChange={e => handleStatusChange(order.id, e.target.value)}
                  className="border border-rose-dust/50 rounded-lg px-3 py-1 text-sm bg-cream dark:bg-navy focus:outline-none"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
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
