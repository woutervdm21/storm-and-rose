// Admin stock management — every product in one table, edit counts inline, save in bulk
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { LOW_STOCK, stockLevel } from '../../lib/stock'

const LEVEL_BADGE = {
  out: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-400',
  low: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400',
  ok:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400',
}
const LEVEL_LABEL = { out: 'Out', low: 'Low', ok: 'In stock' }

export default function AdminStock() {
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [reserved, setReserved]     = useState({})   // product id → units in paid, unshipped orders
  const [edits, setEdits]           = useState({})   // product id → new stock value (unsaved)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)

  // list filters + sort
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterLevel, setFilterLevel] = useState('all') // 'all' | 'out' | 'low' | 'ok'
  const [sort, setSort]           = useState('stock-asc')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: prods }, { data: cats }, { data: paidOrders }] = await Promise.all([
      supabase.from('products').select('id, name, price, stock, image_url, category_id, categories(name)').order('name'),
      supabase.from('categories').select('id, name').order('sort_order').order('name'),
      supabase.from('orders').select('order_items(product_id, quantity)').eq('status', 'paid'),
    ])

    // stock is only deducted on ship, so paid orders still hold units against it
    const held = {}
    paidOrders?.forEach(o => o.order_items?.forEach(i => {
      held[i.product_id] = (held[i.product_id] ?? 0) + i.quantity
    }))

    setProducts(prods ?? [])
    setCategories(cats ?? [])
    setReserved(held)
    setEdits({})
    setLoading(false)
  }

  // current value shown for a product — the unsaved edit if there is one
  const valueOf = (p) => (edits[p.id] !== undefined ? edits[p.id] : p.stock ?? 0)

  function setValue(p, raw) {
    const next = raw === '' ? '' : Math.max(0, parseInt(raw, 10) || 0)
    setEdits(prev => {
      const copy = { ...prev }
      if (next === (p.stock ?? 0)) delete copy[p.id]   // back to original → no longer dirty
      else copy[p.id] = next
      return copy
    })
  }

  const bump = (p, delta) => setValue(p, Math.max(0, (Number(valueOf(p)) || 0) + delta))

  const dirtyIds = Object.keys(edits)

  // save every changed row
  async function saveAll() {
    if (dirtyIds.some(id => edits[id] === '')) {
      toast.error('Fill in a number for every changed product.')
      return
    }
    setSaving(true)
    const results = await Promise.all(
      dirtyIds.map(id => supabase.from('products').update({ stock: edits[id] }).eq('id', id))
    )
    const failed = results.filter(r => r.error).length
    setSaving(false)

    if (failed) toast.error(`${failed} product${failed > 1 ? 's' : ''} could not be saved.`)
    else toast.success(`Stock updated for ${dirtyIds.length} product${dirtyIds.length > 1 ? 's' : ''}`)
    loadAll()
  }

  // filter + sort the list
  const visible = products
    .filter(p => {
      if (search && !p.name.toLowerCase().includes(search.trim().toLowerCase())) return false
      if (filterCat === 'none' && p.category_id) return false
      if (filterCat !== 'all' && filterCat !== 'none' && p.category_id !== filterCat) return false
      if (filterLevel !== 'all' && stockLevel(p.stock) !== filterLevel) return false
      return true
    })
    .sort((a, b) => {
      if (sort === 'name')       return a.name.localeCompare(b.name)
      if (sort === 'stock-desc') return (b.stock ?? 0) - (a.stock ?? 0)
      return (a.stock ?? 0) - (b.stock ?? 0) || a.name.localeCompare(b.name)
    })

  // summary counts across the whole catalogue
  const counts = products.reduce((acc, p) => {
    acc[stockLevel(p.stock)]++
    acc.units += p.stock ?? 0
    return acc
  }, { out: 0, low: 0, ok: 0, units: 0 })

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-rose-dust border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-12 space-y-8 pb-32">
      <div>
        <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust">Stock</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Change as many counts as you like, then save them all at once. Stock drops automatically when an order is marked shipped.
        </p>
      </div>

      {/* summary chips — click to filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryChip label="Units on hand" value={counts.units} active={filterLevel === 'all'} onClick={() => setFilterLevel('all')} />
        <SummaryChip label="Out of stock" value={counts.out} tone="out" active={filterLevel === 'out'} onClick={() => setFilterLevel('out')} />
        <SummaryChip label={`Low (≤${LOW_STOCK})`} value={counts.low} tone="low" active={filterLevel === 'low'} onClick={() => setFilterLevel('low')} />
        <SummaryChip label="In stock" value={counts.ok} tone="ok" active={filterLevel === 'ok'} onClick={() => setFilterLevel('ok')} />
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name"
          aria-label="Search products by name"
          className="input-field w-auto min-w-[14rem] flex-1 max-w-xs"
        />
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} aria-label="Filter by collection" className="input-field w-auto">
          <option value="all">All collections</option>
          <option value="none">Uncategorised</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className="input-field w-auto">
          <option value="stock-asc">Lowest stock first</option>
          <option value="stock-desc">Highest stock first</option>
          <option value="name">Name A–Z</option>
        </select>
        <span className="text-xs text-gray-500 dark:text-gray-400">{visible.length} of {products.length}</span>
      </div>

      {/* stock table */}
      {visible.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-12 text-center">No products match these filters.</p>
      ) : (
        <div className="border border-rose-dust/20 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-rose-dust/10 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <tr>
                <th className="text-left font-medium px-4 py-3">Product</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Status</th>
                <th className="text-right font-medium px-4 py-3 hidden sm:table-cell" title="Units in paid orders that haven't shipped yet">To ship</th>
                <th className="text-center font-medium px-4 py-3">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-dust/15">
              {visible.map(p => {
                const dirty = edits[p.id] !== undefined
                const held  = reserved[p.id] ?? 0
                const level = stockLevel(p.stock)
                return (
                  <tr key={p.id} className={dirty ? 'bg-rose-dust/10' : ''}>
                    {/* product */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-rose-dust/10 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{p.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.categories?.name ?? 'Uncategorised'}</p>
                        </div>
                      </div>
                    </td>

                    {/* status badge */}
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${LEVEL_BADGE[level]}`}>{LEVEL_LABEL[level]}</span>
                    </td>

                    {/* units waiting to ship */}
                    <td className={`px-4 py-2.5 text-right hidden sm:table-cell ${
                      held > (p.stock ?? 0) ? 'text-red-500 font-semibold' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {held || '—'}
                    </td>

                    {/* stock editor */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <StepButton onClick={() => bump(p, -1)} label={`Decrease ${p.name}`}>−</StepButton>
                        <input
                          type="number"
                          min="0"
                          value={valueOf(p)}
                          onChange={(e) => setValue(p, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          aria-label={`Stock for ${p.name}`}
                          className={`w-16 text-center rounded-lg px-2 py-1.5 border bg-transparent
                                      focus:outline-none focus:ring-2 focus:ring-rose-dust/50 ${
                            dirty ? 'border-rose-deep dark:border-rose-dust font-semibold' : 'border-rose-dust/40'
                          }`}
                        />
                        <StepButton onClick={() => bump(p, 1)} label={`Increase ${p.name}`}>+</StepButton>
                      </div>
                      {dirty && (
                        <p className="text-[0.65rem] text-center text-gray-500 dark:text-gray-400 mt-0.5">was {p.stock ?? 0}</p>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* sticky save bar — appears once something has changed */}
      {dirtyIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rose-dust/30 bg-cream/95 dark:bg-navy/95 backdrop-blur">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm">
              {dirtyIds.length} unsaved change{dirtyIds.length > 1 ? 's' : ''}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setEdits({})} disabled={saving} className="btn-secondary !py-2">Discard</button>
              <button onClick={saveAll} disabled={saving} className="btn-primary !py-2">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function StepButton({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-8 h-8 rounded-lg border border-rose-dust/40 text-rose-deep dark:text-rose-dust
                 hover:bg-rose-dust/15 transition-colors"
    >
      {children}
    </button>
  )
}

function SummaryChip({ label, value, tone, active, onClick }) {
  const toneText = { out: 'text-red-600 dark:text-red-400', low: 'text-amber-600 dark:text-amber-400', ok: 'text-emerald-600 dark:text-emerald-400' }
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition-colors ${
        active ? 'border-rose-deep dark:border-rose-dust bg-rose-dust/10' : 'border-rose-dust/20 hover:border-rose-dust/50'
      }`}
    >
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`font-serif text-2xl ${tone ? toneText[tone] : 'text-rose-deep dark:text-rose-dust'}`}>{value}</p>
    </button>
  )
}
