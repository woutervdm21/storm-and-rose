// Storefront — collection showcase and product listing
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'
import Meta from '../components/Meta'

const COLLECTIONS = [
  { id: 'ember',  name: 'Ember',  tagline: 'Where warmth meets indulgence',               image: '/images/Ember.jpg',  color: '#C47D3E' },
  { id: 'roots',  name: 'Roots',  tagline: 'Rooted in natures beauty',                    image: '/images/Roots.jpg',  color: '#4A7C59' },
  { id: 'tides',  name: 'Tides',  tagline: 'Flowing serenity, coastal tranquility',       image: '/images/Tides.jpg',  color: '#2E6B9E' },
  { id: 'zephyr', name: 'Zephyr', tagline: 'Lightness, elegance and uplifting fragrance', image: '/images/Zephyr.jpg', color: '#B8960C' },
]

export default function Storefront() {
  const [products, setProducts]       = useState([])
  const [categories, setCategories]   = useState([])
  const [activeCollection, setActive] = useState(null)
  const [activeCategory, setCategory] = useState(null)
  const [loading, setLoading]         = useState(true)
  const productsRef = useRef(null)

  useEffect(() => {
    async function fetchData() {
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase.from('products').select('*, categories(id, name, collection)'),
        supabase.from('categories').select('*').order('sort_order').order('name'),
      ])
      setProducts(prods ?? [])
      setCategories(cats ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

  function selectCollection(id) {
    const next = activeCollection === id ? null : id
    setActive(next)
    setCategory(null)
    if (next) setTimeout(() => productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  // filter products by active collection then by sub-category
  const byCollection = activeCollection
    ? products.filter(p => p.categories?.collection === activeCollection)
    : products
  const visible = activeCategory
    ? byCollection.filter(p => p.category_id === activeCategory)
    : byCollection

  // sub-categories in the active collection (for pills)
  const subCategories = activeCollection
    ? categories.filter(c => c.collection === activeCollection)
    : categories

  const collectionMeta = COLLECTIONS.find(c => c.id === activeCollection)

  return (
    <main>
      <Meta />

      {/* hero */}
      <section className="relative overflow-hidden bg-navy py-16 px-4 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#8B2E4A22_0%,_transparent_70%)]" />
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.3em] text-rose-dust/60 mb-3">Storm &amp; Rose</p>
          <h1 className="font-serif text-4xl md:text-5xl text-cream mb-3">Our Collections</h1>
          <p className="text-gray-400 max-w-xs mx-auto text-sm leading-relaxed">
            Each collection tells its own story — find yours.
          </p>
        </div>
      </section>

      {/* 4 collection cards */}
      <section className="bg-navy px-4 pb-12 pt-2">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {COLLECTIONS.map(col => {
            const isActive = activeCollection === col.id
            return (
              <button
                key={col.id}
                onClick={() => selectCollection(col.id)}
                className="relative overflow-hidden rounded-2xl group text-left transition-all duration-300 focus:outline-none"
                style={{
                  boxShadow: isActive
                    ? `0 0 0 3px ${col.color}, 0 8px 32px ${col.color}44`
                    : '0 2px 12px rgba(0,0,0,0.4)',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {/* poster image — crop to top to hide contact section */}
                <div className="h-64 sm:h-72 md:h-80 overflow-hidden">
                  <img
                    src={col.image}
                    alt={`${col.name} Collection`}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* bottom gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                {/* text */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="font-serif text-2xl leading-none" style={{ color: col.color }}>
                    {col.name}
                  </p>
                  <p className="text-[11px] text-gray-300 mt-1 leading-snug line-clamp-2">{col.tagline}</p>
                  <p
                    className="text-xs mt-2 transition-colors duration-200"
                    style={{ color: isActive ? col.color : 'rgba(255,255,255,0.5)' }}
                  >
                    {isActive ? '● viewing' : 'Explore →'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* products section */}
      <div ref={productsRef} className="scroll-mt-4" />
      <section className="max-w-6xl mx-auto px-4 py-12">

        {/* active collection header */}
        {collectionMeta ? (
          <div className="mb-8 flex items-start justify-between gap-4 flex-wrap border-b border-rose-dust/20 pb-6">
            <div>
              <h2 className="font-serif text-3xl" style={{ color: collectionMeta.color }}>
                {collectionMeta.name} Collection
              </h2>
              <p className="text-gray-500 dark:text-gray-400 italic text-sm mt-1">{collectionMeta.tagline}</p>
            </div>
            <button
              onClick={() => { setActive(null); setCategory(null) }}
              className="text-sm text-rose-mid hover:text-rose-deep dark:hover:text-rose-dust transition-colors whitespace-nowrap mt-1"
            >
              ← All Collections
            </button>
          </div>
        ) : (
          <h2 className="font-serif text-2xl text-rose-deep dark:text-rose-dust mb-6">All Products</h2>
        )}

        {/* sub-category pills */}
        {!loading && subCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <FilterPill active={activeCategory === null} onClick={() => setCategory(null)}>All</FilterPill>
            {subCategories.map(cat => (
              <FilterPill
                key={cat.id}
                active={activeCategory === cat.id}
                onClick={() => setCategory(cat.id)}
              >
                {cat.name}
              </FilterPill>
            ))}
          </div>
        )}

        {/* loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-rose-dust border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* empty */}
        {!loading && visible.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-20">
            No products in this collection yet.
          </p>
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

function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm px-4 py-1.5 rounded-full transition-colors ${
        active
          ? 'bg-rose-deep text-cream'
          : 'border border-rose-dust/40 text-navy dark:text-cream hover:bg-rose-dust/10'
      }`}
    >
      {children}
    </button>
  )
}
