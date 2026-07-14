// Storefront — accordion collection banners, each expands to show its products
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
  const bannerRefs = useRef({})

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

  // match each collection slug to its DB category id
  const categoryIdFor = (slug) =>
    categories.find(c => c.name.toLowerCase() === slug)?.id ?? null

  function selectCollection(slug) {
    setCollection(slug)
    // scroll so the clicked banner sits just under the navbar
    setTimeout(() => {
      bannerRefs.current[slug]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  const activeMeta = COLLECTION_META.find(c => c.slug === collection) ?? COLLECTION_META[0]

  return (
    <main>
      <Meta />

      {/* minimal page intro */}
      <div
        className="py-8 px-4 text-center transition-colors duration-500"
        style={{ backgroundColor: 'var(--col-bg-dark)' }}
      >
        <p className="text-xs uppercase tracking-[0.35em] mb-1"
           style={{ color: `rgba(${activeMeta.rgb}, 0.6)` }}>
          Storm &amp; Rose
        </p>
        <h1 className="font-serif text-3xl md:text-4xl text-cream">Our Collections</h1>
        <p className="text-gray-500 text-xs mt-2">Click a collection to explore</p>
      </div>

      {/* ── Accordion Banners ──────────────────────── */}
      <div className="w-full" style={{ backgroundColor: 'var(--col-bg-dark)' }}>
        {COLLECTION_META.map(col => {
          const isActive   = collection === col.slug
          const catId      = categoryIdFor(col.slug)
          const colProducts = products.filter(p => p.category_id === catId)

          return (
            <div key={col.slug} ref={el => bannerRefs.current[col.slug] = el}>

              {/* ── Banner ── */}
              <button
                onClick={() => selectCollection(col.slug)}
                className="relative w-full overflow-hidden text-left focus:outline-none block"
                style={{
                  height:     isActive ? '300px' : '80px',
                  transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {/* collection image */}
                <img
                  src={col.image}
                  alt={col.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    objectPosition: 'center 15%',
                    filter:     isActive ? 'brightness(0.85)' : 'brightness(0.5) saturate(0.7)',
                    transition: 'filter 0.5s ease',
                  }}
                />

                {/* gradient — stronger left side for text readability */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: isActive
                      ? 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.1) 100%)'
                      : 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)',
                    transition: 'background 0.5s ease',
                  }}
                />

                {/* left accent bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-500"
                  style={{
                    backgroundColor: col.color,
                    opacity: isActive ? 1 : 0.5,
                    width:   isActive ? '4px' : '2px',
                  }}
                />

                {/* text content */}
                <div className="absolute inset-0 flex items-center px-8 md:px-12 gap-6">
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-serif leading-none transition-all duration-500"
                      style={{
                        color:    col.color,
                        fontSize: isActive ? '2.5rem' : '1.4rem',
                      }}
                    >
                      {col.name}
                    </p>
                    <p
                      className="text-gray-300 italic mt-2 transition-all duration-500 overflow-hidden"
                      style={{
                        fontSize:  '0.85rem',
                        maxHeight: isActive ? '40px' : '0px',
                        opacity:   isActive ? 1 : 0,
                      }}
                    >
                      {col.tagline}
                    </p>
                    {isActive && (
                      <p className="text-xs mt-4 uppercase tracking-widest"
                         style={{ color: `rgba(${col.rgb}, 0.7)` }}>
                        Hand-poured · Scented · Soy Blend
                      </p>
                    )}
                  </div>

                  {/* right side: product count or chevron */}
                  <div className="flex-shrink-0 text-right">
                    {isActive ? (
                      <span
                        className="text-xs uppercase tracking-widest"
                        style={{ color: `rgba(${col.rgb}, 0.7)` }}
                      >
                        {loading ? '…' : `${colProducts.length} candle${colProducts.length !== 1 ? 's' : ''}`}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-lg">﹀</span>
                    )}
                  </div>
                </div>
              </button>

              {/* ── Products (only when active) ── */}
              <div
                style={{
                  maxHeight:  isActive ? '9999px' : '0px',
                  overflow:   'hidden',
                  transition: isActive
                    ? 'max-height 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                    : 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <div className="bg-col-bg dark:bg-col-bg-dark transition-colors duration-500 px-4 md:px-8 py-10">
                  <div className="max-w-6xl mx-auto">
                    {loading && (
                      <div className="flex justify-center py-12">
                        <div
                          className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                          style={{ borderColor: `${col.color} transparent ${col.color} ${col.color}` }}
                        />
                      </div>
                    )}

                    {!loading && colProducts.length === 0 && (
                      <div className="text-center py-16">
                        <p className="font-serif text-xl mb-1" style={{ color: col.color }}>Coming Soon</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No candles in this collection yet — check back soon.
                        </p>
                      </div>
                    )}

                    {!loading && colProducts.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                        {colProducts.map(product => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )
        })}
      </div>
    </main>
  )
}
