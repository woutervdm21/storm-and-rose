// Admin analytics — action alerts, KPIs, revenue chart, status breakdown, top products
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { supabase } from '../../lib/supabase'

const COLORS = {
  pending_payment: '#F59E0B',
  paid:            '#10B981',
  shipped:         '#3B82F6',
}
const BAR_COLOR = '#B5607A'

// alert severity config
const SEVERITY = {
  red:   'border-red-400 bg-red-50 dark:bg-red-400/10 text-red-700 dark:text-red-400',
  amber: 'border-amber-400 bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400',
  blue:  'border-blue-400 bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400',
}

export default function AdminAnalytics() {
  const [loading, setLoading]           = useState(true)
  const [alerts, setAlerts]             = useState([])
  const [kpis, setKpis]                 = useState({ revenue: 0, orders: 0, avgOrder: 0, pending: 0 })
  const [statusData, setStatusData]     = useState([])
  const [revenueData, setRevenueData]   = useState([])
  const [topProducts, setTopProducts]   = useState([])

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [
      { data: orders },
      { data: products },
      { data: items },
    ] = await Promise.all([
      supabase.from('orders').select('id, status, created_at, order_items(quantity, unit_price)'),
      supabase.from('products').select('id, name, stock, description, image_url, category_id'),
      supabase.from('order_items').select('quantity, product_id, products(name)'),
    ])

    if (!orders) { setLoading(false); return }

    // --- alerts ---
    const pendingPayment  = orders.filter(o => o.status === 'pending_payment')
    const paidUnshipped   = orders.filter(o => o.status === 'paid')
    const outOfStock      = (products ?? []).filter(p => p.stock === 0)
    const lowStock        = (products ?? []).filter(p => p.stock > 0 && p.stock <= 3)
    const noDescription   = (products ?? []).filter(p => !p.description?.trim())
    const noImage         = (products ?? []).filter(p => !p.image_url)
    const uncategorised   = (products ?? []).filter(p => !p.category_id)

    const computed = [
      pendingPayment.length > 0 && {
        severity: 'red',
        icon: '💳',
        message: `${pendingPayment.length} order${pendingPayment.length > 1 ? 's' : ''} awaiting payment`,
        action: 'Review orders',
        to: '/admin/orders',
      },
      paidUnshipped.length > 0 && {
        severity: 'amber',
        icon: '📦',
        message: `${paidUnshipped.length} paid order${paidUnshipped.length > 1 ? 's' : ''} not yet shipped`,
        action: 'View orders',
        to: '/admin/orders',
      },
      outOfStock.length > 0 && {
        severity: 'red',
        icon: '🚫',
        message: `${outOfStock.length} product${outOfStock.length > 1 ? 's' : ''} out of stock`,
        action: 'Update stock',
        to: '/admin/products',
      },
      lowStock.length > 0 && {
        severity: 'amber',
        icon: '⚠️',
        message: `${lowStock.length} product${lowStock.length > 1 ? 's' : ''} running low (≤3 remaining)`,
        action: 'Update stock',
        to: '/admin/products',
      },
      noDescription.length > 0 && {
        severity: 'blue',
        icon: '📝',
        message: `${noDescription.length} product${noDescription.length > 1 ? 's' : ''} missing a description`,
        action: 'Edit products',
        to: '/admin/products',
      },
      noImage.length > 0 && {
        severity: 'blue',
        icon: '🖼️',
        message: `${noImage.length} product${noImage.length > 1 ? 's' : ''} missing an image`,
        action: 'Edit products',
        to: '/admin/products',
      },
      uncategorised.length > 0 && {
        severity: 'blue',
        icon: '🗂️',
        message: `${uncategorised.length} product${uncategorised.length > 1 ? 's' : ''} not assigned to a category`,
        action: 'Assign categories',
        to: '/admin/categories',
      },
    ].filter(Boolean)

    setAlerts(computed)

    // --- KPIs ---
    const completedOrders = orders.filter(o => o.status === 'paid' || o.status === 'shipped')
    const revenue = completedOrders.reduce((sum, o) =>
      sum + (o.order_items?.reduce((s, i) => s + i.quantity * i.unit_price, 0) ?? 0), 0)

    setKpis({
      revenue,
      orders:   orders.length,
      avgOrder: completedOrders.length ? revenue / completedOrders.length : 0,
      pending:  pendingPayment.length,
    })

    // --- orders by status ---
    const statusCounts = orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1
      return acc
    }, {})
    setStatusData(
      Object.entries(statusCounts).map(([status, value]) => ({
        name:  status.replace('_', ' '),
        value,
        color: COLORS[status] ?? '#C4788A',
      }))
    )

    // --- revenue per day, last 30 days ---
    const today = new Date()
    const days  = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (29 - i))
      return d.toISOString().slice(0, 10)
    })
    const revenueByDay = Object.fromEntries(days.map(d => [d, 0]))
    completedOrders.forEach(o => {
      const day = o.created_at.slice(0, 10)
      if (revenueByDay[day] !== undefined)
        revenueByDay[day] += o.order_items?.reduce((s, i) => s + i.quantity * i.unit_price, 0) ?? 0
    })
    setRevenueData(days.map(d => ({ date: d.slice(5), revenue: parseFloat(revenueByDay[d].toFixed(2)) })))

    // --- top products by units sold ---
    const productTotals = {}
    items?.forEach(item => {
      const name = item.products?.name ?? 'Unknown'
      productTotals[name] = (productTotals[name] ?? 0) + item.quantity
    })
    setTopProducts(
      Object.entries(productTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, units]) => ({ name, units }))
    )

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-rose-dust border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const maxUnits = topProducts[0]?.units ?? 1

  return (
    <main className="max-w-5xl mx-auto px-4 py-12 space-y-12">
      <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust">Analytics</h1>

      {/* action alerts */}
      <section>
        <h2 className="font-serif text-lg text-rose-deep dark:text-rose-dust mb-4">Action Items</h2>

        {alerts.length === 0 ? (
          <div className="border border-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 rounded-xl px-5 py-4 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
            ✓ Everything looks good — no action required
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {alerts.map((alert, i) => (
              <div key={i} className={`border rounded-xl px-4 py-3 flex items-center justify-between gap-4 ${SEVERITY[alert.severity]}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg flex-shrink-0">{alert.icon}</span>
                  <p className="text-sm font-medium leading-snug">{alert.message}</p>
                </div>
                <Link
                  to={alert.to}
                  className="text-xs font-semibold whitespace-nowrap underline underline-offset-2 flex-shrink-0"
                >
                  {alert.action} →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue"   value={`R ${kpis.revenue.toFixed(2)}`} />
        <KpiCard label="Total Orders"    value={kpis.orders} />
        <KpiCard label="Avg Order Value" value={`R ${kpis.avgOrder.toFixed(2)}`} />
        <KpiCard label="Pending Payment" value={kpis.pending} highlight={kpis.pending > 0} />
      </div>

      {/* revenue + status charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 bg-cream dark:bg-navy border border-rose-dust/20 rounded-xl p-6">
          <h2 className="font-serif text-lg text-rose-deep dark:text-rose-dust mb-6">Revenue — Last 30 Days</h2>
          {revenueData.every(d => d.revenue === 0) ? (
            <p className="text-sm text-gray-400 text-center py-10">No completed orders yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R${v}`} width={50} />
                <Tooltip formatter={v => [`R ${v}`, 'Revenue']} />
                <Bar dataKey="revenue" fill={BAR_COLOR} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-cream dark:bg-navy border border-rose-dust/20 rounded-xl p-6">
          <h2 className="font-serif text-lg text-rose-deep dark:text-rose-dust mb-6">Orders by Status</h2>
          {statusData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No orders yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs">{v}</span>} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* top products */}
      <div className="bg-cream dark:bg-navy border border-rose-dust/20 rounded-xl p-6">
        <h2 className="font-serif text-lg text-rose-deep dark:text-rose-dust mb-6">Top Products by Units Sold</h2>
        {topProducts.length === 0 ? (
          <p className="text-sm text-gray-400">No sales data yet</p>
        ) : (
          <ul className="space-y-4">
            {topProducts.map((p, i) => (
              <li key={i} className="flex items-center gap-4">
                <span className="w-5 text-sm text-gray-400 text-right">{i + 1}</span>
                <span className="w-40 text-sm font-medium truncate">{p.name}</span>
                <div className="flex-1 bg-rose-dust/15 rounded-full h-2.5">
                  <div className="bg-rose-mid h-2.5 rounded-full" style={{ width: `${(p.units / maxUnits) * 100}%` }} />
                </div>
                <span className="text-sm font-semibold w-10 text-right">{p.units}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

function KpiCard({ label, value, highlight = false }) {
  return (
    <div className={`rounded-xl border p-5 ${
      highlight ? 'border-amber-400 bg-amber-50 dark:bg-amber-400/10' : 'border-rose-dust/20 bg-cream dark:bg-navy'
    }`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="font-serif text-2xl text-rose-deep dark:text-rose-dust">{value}</p>
    </div>
  )
}
