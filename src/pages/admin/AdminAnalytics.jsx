// Admin analytics — KPIs, revenue over time, order status breakdown, top products
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { supabase } from '../../lib/supabase'

// brand colours for charts
const COLORS = {
  pending_payment: '#F59E0B',
  paid:            '#10B981',
  shipped:         '#3B82F6',
}
const BAR_COLOR = '#B5607A'

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis]       = useState({ revenue: 0, orders: 0, avgOrder: 0, pending: 0 })
  const [statusData, setStatusData]   = useState([])
  const [revenueData, setRevenueData] = useState([])
  const [topProducts, setTopProducts] = useState([])

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    // fetch all orders with their items in one query
    const { data: orders } = await supabase
      .from('orders')
      .select('id, status, created_at, order_items(quantity, unit_price)')

    if (!orders) { setLoading(false); return }

    // --- KPIs ---
    const completedOrders = orders.filter(o => o.status === 'paid' || o.status === 'shipped')
    const revenue = completedOrders.reduce((sum, o) =>
      sum + (o.order_items?.reduce((s, i) => s + i.quantity * i.unit_price, 0) ?? 0), 0)
    const pending = orders.filter(o => o.status === 'pending_payment').length

    setKpis({
      revenue,
      orders:   orders.length,
      avgOrder: completedOrders.length ? revenue / completedOrders.length : 0,
      pending,
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

    // --- revenue per day over the last 30 days ---
    const today = new Date()
    const days  = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (29 - i))
      return d.toISOString().slice(0, 10)
    })

    const revenueByDay = Object.fromEntries(days.map(d => [d, 0]))
    completedOrders.forEach(o => {
      const day = o.created_at.slice(0, 10)
      if (revenueByDay[day] !== undefined) {
        revenueByDay[day] += o.order_items?.reduce((s, i) => s + i.quantity * i.unit_price, 0) ?? 0
      }
    })
    setRevenueData(
      days.map(d => ({
        date:    d.slice(5),   // show MM-DD
        revenue: parseFloat(revenueByDay[d].toFixed(2)),
      }))
    )

    // --- top products by units sold ---
    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, product_id, products(name)')

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

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue"    value={`R ${kpis.revenue.toFixed(2)}`} />
        <KpiCard label="Total Orders"     value={kpis.orders} />
        <KpiCard label="Avg Order Value"  value={`R ${kpis.avgOrder.toFixed(2)}`} />
        <KpiCard label="Pending Payment"  value={kpis.pending} highlight={kpis.pending > 0} />
      </div>

      {/* revenue over time + status breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* bar chart — last 30 days */}
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

        {/* pie chart — orders by status */}
        <div className="bg-cream dark:bg-navy border border-rose-dust/20 rounded-xl p-6">
          <h2 className="font-serif text-lg text-rose-deep dark:text-rose-dust mb-6">Orders by Status</h2>
          {statusData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No orders yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
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
                {/* progress bar */}
                <div className="flex-1 bg-rose-dust/15 rounded-full h-2.5">
                  <div
                    className="bg-rose-mid h-2.5 rounded-full transition-all"
                    style={{ width: `${(p.units / maxUnits) * 100}%` }}
                  />
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
      highlight
        ? 'border-amber-400 bg-amber-50 dark:bg-amber-400/10'
        : 'border-rose-dust/20 bg-cream dark:bg-navy'
    }`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="font-serif text-2xl text-rose-deep dark:text-rose-dust">{value}</p>
    </div>
  )
}
