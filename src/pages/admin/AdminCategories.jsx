// Admin categories — drag products into the collection columns
import { useEffect, useState } from 'react'
import { DndContext, DragOverlay, useDroppable, useDraggable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'

const UNCATEGORISED = '__uncategorised__'

const COLLECTION_COLORS = {
  Ember: '#C47D3E', Roots: '#4A7C59', Tides: '#2E6B9E', Zephyr: '#B8960C',
  'Limited Edition': '#B76E79',
}

export default function AdminCategories() {
  const [products, setProducts]           = useState([])
  const [categories, setCategories]       = useState([])
  const [activeProduct, setActiveProduct] = useState(null)

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
      p.id === productId
        ? { ...p, category_id: newCatId, categories: categories.find(c => c.id === newCatId) ?? null }
        : p
    ))

    const { error } = await supabase.from('products').update({ category_id: newCatId }).eq('id', productId)
    if (error) { toast.error('Failed to move product'); loadAll() }
  }

  const grouped = {
    [UNCATEGORISED]: products.filter(p => !p.category_id),
    ...Object.fromEntries(categories.map(c => [c.id, products.filter(p => p.category_id === c.id)])),
  }

  const columns = [
    { id: UNCATEGORISED, name: 'Uncategorised' },
    ...categories.map(c => ({ id: c.id, name: c.name })),
  ]

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust mb-2">Collections</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Drag products into a collection to assign them.</p>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 pb-6 grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]">
          {columns.map(col => (
            <CategoryColumn
              key={col.id}
              column={col}
              products={grouped[col.id] ?? []}
            />
          ))}
        </div>

        <DragOverlay>
          {activeProduct && <ProductCard product={activeProduct} overlay />}
        </DragOverlay>
      </DndContext>

      <p className="text-xs text-gray-400 mt-4">Drag products between columns to reassign their collection.</p>
    </main>
  )
}

function CategoryColumn({ column, products }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const accentColor = COLLECTION_COLORS[column.name] ?? null

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h2
          className="font-semibold text-sm leading-tight"
          style={accentColor ? { color: accentColor } : {}}
        >
          {column.name}
        </h2>
        <span className="text-xs text-gray-400 flex-shrink-0">{products.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-32 rounded-xl border-2 border-dashed p-2 space-y-2 transition-colors ${
          isOver
            ? 'border-rose-deep bg-rose-dust/10'
            : 'border-rose-dust/30 bg-rose-dust/5 dark:bg-rose-dust/5'
        }`}
        style={isOver && accentColor ? { borderColor: accentColor, backgroundColor: `${accentColor}15` } : {}}
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

function ProductCard({ product, overlay = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: product.id })

  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined

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
