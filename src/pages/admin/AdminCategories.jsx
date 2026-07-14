// Admin categories — manage categories, assign to collections, drag products between them
import { useEffect, useState } from 'react'
import { DndContext, DragOverlay, useDroppable, useDraggable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'

const UNCATEGORISED = '__uncategorised__'

const COLLECTION_OPTIONS = [
  { value: '',       label: 'No collection' },
  { value: 'ember',  label: 'Ember'  },
  { value: 'roots',  label: 'Roots'  },
  { value: 'tides',  label: 'Tides'  },
  { value: 'zephyr', label: 'Zephyr' },
]

const COLLECTION_COLORS = {
  ember:  '#C47D3E',
  roots:  '#4A7C59',
  tides:  '#2E6B9E',
  zephyr: '#B8960C',
}

export default function AdminCategories() {
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [catName, setCatName]       = useState('')
  const [catLoading, setCatLoading] = useState(false)
  const [activeProduct, setActiveProduct] = useState(null)

  // require 8px movement before drag starts — prevents accidental drags on click
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from('products').select('*, categories(id, name)').order('name'),
      supabase.from('categories').select('*').order('sort_order').order('name'),
    ])
    setProducts(prods ?? [])
    setCategories(cats ?? [])
  }

  // --- drag handlers ---
  function handleDragStart(event) {
    setActiveProduct(products.find(p => p.id === event.active.id) ?? null)
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    setActiveProduct(null)
    if (!over) return

    const productId = active.id
    const newCatId  = over.id === UNCATEGORISED ? null : over.id
    const product   = products.find(p => p.id === productId)

    if ((product.category_id ?? UNCATEGORISED) === (newCatId ?? UNCATEGORISED)) return

    // optimistic update
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, category_id: newCatId, categories: categories.find(c => c.id === newCatId) ?? null } : p
    ))

    const { error } = await supabase.from('products').update({ category_id: newCatId }).eq('id', productId)
    if (error) { toast.error('Failed to update category'); loadAll() }
  }

  // --- category CRUD ---
  async function handleAddCategory(e) {
    e.preventDefault()
    if (!catName.trim()) return
    setCatLoading(true)
    await supabase.from('categories').insert({ name: catName.trim() })
    toast.success(`Category "${catName}" added`)
    setCatName('')
    setCatLoading(false)
    loadAll()
  }

  async function handleDeleteCategory(id, name) {
    if (!confirm(`Delete "${name}"? Products will become uncategorised.`)) return
    await supabase.from('categories').delete().eq('id', id)
    toast.success(`"${name}" deleted`)
    loadAll()
  }

  // assign a category to a collection
  async function handleCollectionChange(categoryId, collection) {
    await supabase.from('categories').update({ collection: collection || null }).eq('id', categoryId)
    setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, collection: collection || null } : c))
    toast.success('Collection updated')
  }

  const grouped = {
    [UNCATEGORISED]: products.filter(p => !p.category_id),
    ...Object.fromEntries(categories.map(c => [c.id, products.filter(p => p.category_id === c.id)])),
  }

  const columns = [
    { id: UNCATEGORISED, name: 'Uncategorised', deletable: false, collection: null },
    ...categories.map(c => ({ id: c.id, name: c.name, deletable: true, collection: c.collection })),
  ]

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust mb-8">Categories</h1>

      {/* add category */}
      <form onSubmit={handleAddCategory} className="flex gap-3 mb-10">
        <input
          value={catName}
          onChange={e => setCatName(e.target.value)}
          placeholder="New category name…"
          className="input-field max-w-xs"
        />
        <button type="submit" disabled={catLoading} className="btn-primary">Add Category</button>
      </form>

      {/* drag-and-drop board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6">
          {columns.map(col => (
            <CategoryColumn
              key={col.id}
              column={col}
              products={grouped[col.id] ?? []}
              onDelete={col.deletable ? () => handleDeleteCategory(col.id, col.name) : null}
              onCollectionChange={col.deletable ? (val) => handleCollectionChange(col.id, val) : null}
            />
          ))}
        </div>

        <DragOverlay>
          {activeProduct && <ProductCard product={activeProduct} overlay />}
        </DragOverlay>
      </DndContext>

      <p className="text-xs text-gray-400 mt-4">Drag products between columns to reassign their category.</p>
    </main>
  )
}

// --- droppable category column ---
function CategoryColumn({ column, products, onDelete, onCollectionChange }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const accentColor = COLLECTION_COLORS[column.collection] ?? null

  return (
    <div className="flex-shrink-0 w-56">
      {/* column header */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <h2
            className="font-semibold text-sm truncate"
            style={accentColor ? { color: accentColor } : {}}
          >
            {column.name}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{products.length}</span>
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-gray-400 hover:text-red-400 transition-colors text-sm leading-none"
                aria-label="Delete category"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* collection assignment dropdown */}
        {onCollectionChange && (
          <select
            value={column.collection ?? ''}
            onChange={e => onCollectionChange(e.target.value)}
            className="w-full text-xs rounded-lg border border-rose-dust/30 bg-cream dark:bg-navy px-2 py-1 text-gray-500 dark:text-gray-400 focus:outline-none focus:border-rose-dust"
            style={accentColor ? { borderColor: `${accentColor}88`, color: accentColor } : {}}
          >
            {COLLECTION_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* droppable zone */}
      <div
        ref={setNodeRef}
        className={`min-h-32 rounded-xl border-2 border-dashed p-2 space-y-2 transition-colors ${
          isOver
            ? 'border-rose-deep bg-rose-dust/10'
            : 'border-rose-dust/30 bg-rose-dust/5 dark:bg-rose-dust/5'
        }`}
      >
        {products.length === 0 && (
          <p className="text-xs text-gray-400 text-center pt-6">Drop here</p>
        )}
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}

// --- draggable product card ---
function ProductCard({ product, overlay = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: product.id })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-cream dark:bg-navy border border-rose-dust/20 rounded-lg p-2 flex items-center gap-2 select-none transition-shadow ${
        isDragging && !overlay ? 'opacity-40' : ''
      } ${overlay ? 'shadow-xl rotate-1' : 'cursor-grab active:cursor-grabbing hover:shadow-md'}`}
    >
      {product.image_url ? (
        <img src={product.image_url} alt={product.name} className="w-9 h-9 rounded object-cover flex-shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded bg-rose-dust/20 flex-shrink-0" />
      )}
      <p className="text-xs font-medium leading-tight line-clamp-2">{product.name}</p>
    </div>
  )
}
