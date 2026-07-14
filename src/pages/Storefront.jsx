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
    if (collection === slug) {
      // clicking the active collection collapses it
      setCollection(null)
      return
    }
    setCollection(slug)
    // scroll to the top of the banner, offset for the sticky navbar (~68px)
    setTimeout(() => {
      const el = bannerRefs.current[slug]
      if (el) {
        const top = el.getBoundingClientRect().top + window.pageYOffset - 68
        window.scrollTo({ top, behavior: 'smooth' })
      }
    }, 60)
  }

  return (
    <main>
      <Meta />

      {/* ── Accordion Banners ──────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {COLLECTION_META.map(col => {
          const isActive    = collection === col.slug
          const catId       = categoryIdFor(col.slug)
          const colProducts = products.filter(p => p.category_id === catId)

          return (
            <div key={col.slug} ref={el => bannerRefs.current[col.slug] = el} className="mb-2 last:mb-0">

              {/* ── Banner ── */}
              <button
                onClick={() => selectCollection(col.slug)}
                className="relative w-full overflow-hidden focus:outline-none block rounded-xl"
                style={{
                  height:     isActive ? '300px' : '72px',
                  transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow:  isActive ? `0 0 0 2px ${col.color}` : 'none',
                }}
              >
                {/* collection image — centre on the logo/name area of the poster */}
                <img
                  src={col.image}
                  alt={col.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    objectPosition: 'center 12%',
                    filter:     isActive ? 'brightness(1)' : 'brightness(0.45) saturate(0.6)',
                    transition: 'filter 0.5s ease',
                  }}
                />

                {/* subtle bottom fade so it blends into the page bg */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-12"
                       style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.3))' }} />
                )}

                {/* active accent line along the bottom edge */}
                <div
                  className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                  style={{
                    height:          isActive ? '3px' : '2px',
                    backgroundColor: col.color,
                    opacity:         isActive ? 1 : 0.4,
                  }}
                />
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
                <div className="py-8">
                  {loading && (
                    <div className="flex justify-center py-12">
                      <div
                        className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: `${col.color} transparent ${col.color} ${col.color}` }}
                      />
                    </div>
                  )}

                  {!loading && colProducts.length === 0 && (
                    <div className="text-center py-12">
                      <p className="font-serif text-xl mb-1" style={{ color: col.color }}>Coming Soon</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No candles in this collection yet — check back soon.
                      </p>
                    </div>
                  )}

                  {!loading && colProducts.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {colProducts.map(product => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )
        })}
      </div>
    </main>
  )
}
