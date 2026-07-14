// Storefront — collection showcase drives the whole site theme
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'
import Meta from '../components/Meta'
import { useCollection } from '../context/CollectionContext'

const COLLECTION_META = [
  { slug: 'ember',  name: 'Ember',  tagline: 'Where warmth meets indulgence',               image: '/images/Ember.jpg',  color: '#C47D3E', rgb: '196,125,62'  },
  { slug: 'roots',  name: 'Roots',  tagline: 'Rooted in natures beauty',                    image: '/images/Roots.jpg',  color: '#4A7C59', rgb: '74,124,89'   },
  { slug: 'tides',  name: 'Tides',  tagline: 'Flowing serenity, coastal tranquility',       image: '/images/Tides.jpg',  color: '#2E6B9E', rgb: '46,107,158'  },
  { slug: 'zephyr', name: 'Zephyr', tagline: 'Lightness, elegance and uplifting fragrance', image: '/images/Zephyr.jpg', color: '#B8960C', rgb: '184,150,12'  },
]

export default function Storefront() {
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const { collection, setCollection } = useCollection()
  const productsRef = useRef(null)

  useEffect(() => {
    async function fetchData() {
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase.from('products').select('*, categories(id, name)'),
        supabase.from('categories').select('*').order('sort_order').order('name'),
      ])
      setProducts(prods ?? [])
      setCategories(cats ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

  // Pair each collection with its DB category row (matched by name)
  const collections = COLLECTION_META.map(meta => ({
    ...meta,
    categoryId: categories.find(c => c.name.toLowerCase() === meta.slug)?.id ?? null,
  }))

  const activeMeta       = COLLECTION_META.find(c => c.slug === collection) ?? COLLECTION_META[0]
  const activeCategoryId = collections.find(c => c.slug === collection)?.categoryId ?? null

  function selectCollection(slug) {
    setCollection(slug)
    setTimeout(() => productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const visible = activeCategoryId
    ? products.filter(p => p.category_id === activeCategoryId)
    : products

  return (
    <main>
      <Meta />

      {/* ── Hero ─────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-16 px-4 text-center transition-colors duration-500"
        style={{ backgroundColor: 'var(--col-bg-dark)' }}
      >
        {/* collection-coloured radial glow */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, rgba(${activeMeta.rgb}, 0.18) 0%, transparent 65%)`,
          }}
        />
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.35em] mb-3 transition-colors duration-500"
             style={{ color: `rgba(${activeMeta.rgb}, 0.7)` }}>
            Storm &amp; Rose
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-cream mb-2">Our Collections</h1>
          <p className="text-gray-400 max-w-xs mx-auto text-sm leading-relaxed">
            Select a collection below — the whole store transforms.
          </p>
        </div>
      </section>

      {/* ── Collection Cards ─────────────────────────── */}
      <section
        className="px-4 pb-16 pt-6 transition-colors duration-500"
        style={{ backgroundColor: 'var(--col-bg-dark)' }}
      >
        {/* "select a collection" nudge — only shown before user has explicitly chosen */}
        <p className="text-center text-xs uppercase tracking-widest text-gray-500 mb-5">
          Choose your collection
        </p>

        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {collections.map(col => {
            const isActive = collection === col.slug
            return (
              <button
                key={col.slug}
                onClick={() => selectCollection(col.slug)}
                className="relative overflow-hidden rounded-2xl text-left focus:outline-none"
                style={{
                  transition: 'transform 0.35s ease, box-shadow 0.35s ease, opacity 0.35s ease',
                  transform:  isActive ? 'scale(1.05)' : 'scale(0.97)',
                  opacity:    isActive ? 1 : 0.45,
                  boxShadow:  isActive
                    ? `0 0 0 3px ${col.color}, 0 0 40px ${col.color}66, 0 16px 40px rgba(0,0,0,0.5)`
                    : '0 2px 16px rgba(0,0,0,0.5)',
                }}
              >
                {/* poster — crop top: cuts contact info at bottom */}
                <div className="h-64 sm:h-72 md:h-80 overflow-hidden">
                  <img
                    src={col.image}
                    alt={`${col.name} Collection`}
                    className="w-full h-full object-cover object-top"
                    style={{
                      transition: 'transform 0.5s ease, filter 0.35s ease',
                      transform:  isActive ? 'scale(1.04)' : 'scale(1)',
                      filter:     isActive ? 'none' : 'grayscale(20%) brightness(0.7)',
                    }}
                  />
                </div>

                {/* gradient overlay — lighter when active so poster shows more */}
                <div
                  className="absolute inset-0 transition-opacity duration-350"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.05) 55%, transparent 100%)',
                    opacity: isActive ? 0.75 : 1,
                  }}
                />

                {/* collection info */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p
                    className="font-serif text-2xl leading-none transition-colors duration-350"
                    style={{ color: col.color }}
                  >
                    {col.name}
                  </p>
                  <p className="text-[11px] text-gray-300 mt-1 leading-snug line-clamp-2">
                    {col.tagline}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    {isActive ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: col.color }} />
                        <span className="text-xs font-medium" style={{ color: col.color }}>Currently viewing</span>
                      </>
                    ) : (
                      <span className="text-xs text-white/50">Explore →</span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Products ─────────────────────────────────── */}
      <div ref={productsRef} className="scroll-mt-4" />
      <section className="max-w-6xl mx-auto px-4 py-12">

        {/* collection heading */}
        <div className="mb-10 pb-6 border-b border-rose-dust/20 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest text-rose-dust/60 mb-1 transition-colors duration-500">
              Collection
            </p>
            <h2
              className="font-serif text-3xl md:text-4xl transition-colors duration-500"
              style={{ color: activeMeta.color }}
            >
              {activeMeta.name}
            </h2>
            <p className="italic text-sm text-gray-500 dark:text-gray-400 mt-1">{activeMeta.tagline}</p>
          </div>
          {!loading && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {visible.length} {visible.length === 1 ? 'candle' : 'candles'}
            </p>
          )}
        </div>

        {/* loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin transition-colors duration-500"
              style={{ borderColor: `${activeMeta.color} transparent ${activeMeta.color} ${activeMeta.color}` }}
            />
          </div>
        )}

        {/* empty */}
        {!loading && visible.length === 0 && (
          <div className="text-center py-24">
            <p className="font-serif text-2xl mb-2" style={{ color: activeMeta.color }}>
              Coming Soon
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No candles in the {activeMeta.name} collection yet — check back soon.
            </p>
          </div>
        )}

        {/* grid */}
        {!loading && visible.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {visible.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
