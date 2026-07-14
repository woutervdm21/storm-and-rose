// Storefront — hero, accordion collection banners, about section
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'
import Meta from '../components/Meta'
import { useCollection } from '../context/CollectionContext'

const COLLECTION_META = [
  // banner: landscape strip used in the accordion (update as new banners arrive)
  // image:  portrait poster used elsewhere
  { slug: 'ember',  name: 'Ember',  tagline: 'Where warmth meets indulgence',               banner: '/images/Ember-Banner.jpg', image: '/images/Ember.jpg',  color: '#C47D3E', rgb: '196,125,62'  },
  { slug: 'roots',  name: 'Roots',  tagline: 'Rooted in natures beauty',                    banner: '/images/Roots.jpg',        image: '/images/Roots.jpg',  color: '#4A7C59', rgb: '74,124,89'   },
  { slug: 'tides',  name: 'Tides',  tagline: 'Flowing serenity, coastal tranquility',       banner: '/images/Tides.jpg',        image: '/images/Tides.jpg',  color: '#2E6B9E', rgb: '46,107,158'  },
  { slug: 'zephyr', name: 'Zephyr', tagline: 'Lightness, elegance and uplifting fragrance', banner: '/images/Zephyr.jpg',       image: '/images/Zephyr.jpg', color: '#B8960C', rgb: '184,150,12'  },
]

// Collapse animation duration in ms — must match the CSS transition
const COLLAPSE_DURATION = 500

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

  const categoryIdFor = (slug) =>
    categories.find(c => c.name.toLowerCase() === slug)?.id ?? null

  function selectCollection(slug) {
    // clicking the active collection collapses it — no scroll needed
    if (collection === slug) {
      setCollection(null)
      return
    }
    setCollection(slug)
    // Wait for the previous banner to finish collapsing before scrolling,
    // so getBoundingClientRect sees the final layout position.
    setTimeout(() => {
      const el = bannerRefs.current[slug]
      if (!el) return
      const navbarHeight = 68
      const top = el.getBoundingClientRect().top + window.pageYOffset - navbarHeight
      window.scrollTo({ top, behavior: 'smooth' })
    }, COLLAPSE_DURATION + 20)
  }

  return (
    <main>
      <Meta />

      {/* ── Hero ─────────────────────────────────────── */}
      <section
        id="home"
        className="relative overflow-hidden py-20 md:py-28 px-4 text-center
                   bg-col-bg dark:bg-col-bg-dark transition-colors duration-500"
      >
        {/* collection-coloured radial glow — subtle in light, vivid in dark */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgb(var(--col-primary-rgb) / 0.15) 0%, transparent 65%)' }}
        />
        <div className="relative z-10 max-w-xl mx-auto">
          <img
            src="/images/Logo1.png"
            alt="Storm & Rose"
            className="h-20 w-20 object-contain mx-auto mb-6 opacity-90"
          />
          <h1 className="font-serif text-5xl md:text-6xl mb-4 leading-tight
                         text-rose-deep dark:text-cream transition-colors duration-500">
            Storm &amp; Rose
          </h1>
          <p className="text-base md:text-lg leading-relaxed mb-8
                        text-gray-600 dark:text-gray-400 transition-colors duration-300">
            Luxury Candles &amp; Thoughtful Designs,<br />Handcrafted with Love
          </p>
          <button
            onClick={() => {
              document.getElementById('candles')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            className="btn-primary px-8 py-3 text-sm tracking-wide"
          >
            Explore Collections
          </button>
        </div>
      </section>

      {/* ── About Us ─────────────────────────────────── */}
      <section id="about" className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="rounded-2xl overflow-hidden shadow-xl order-2 md:order-1">
            <img src="/images/Rooibos.png" alt="Storm & Rose candles" className="w-full h-80 md:h-full object-cover" />
          </div>
          <div className="order-1 md:order-2">
            <p className="text-xs uppercase tracking-[0.3em] text-rose-dust mb-3 transition-colors duration-500">Our Story</p>
            <h2 className="font-serif text-4xl text-rose-deep dark:text-rose-dust mb-6 transition-colors duration-500">
              About Storm &amp; Rose
            </h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300 leading-relaxed">
              <p>
                Born from a deep passion for warmth, beauty, and intentional living, Storm &amp; Rose crafts luxury soy blend candles that turn everyday moments into something extraordinary.
              </p>
              <p>
                Every candle is hand-poured with care using premium fragrance oils and natural soy wax — designed not just to fill a room with scent, but to tell a story. Our four collections — Ember, Roots, Tides, and Zephyr — each capture a different mood, a different world.
              </p>
              <p>
                We are a Storm of Faith venture, based in Mpumalanga, South Africa. Small batch. Handcrafted. Made with love.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-rose-dust/20 flex flex-col gap-2">
              <p className="text-sm font-semibold text-rose-deep dark:text-rose-dust transition-colors duration-500">Get in touch</p>
              <a href="mailto:Stormyvisions@yahoo.com" className="text-sm text-gray-500 hover:text-rose-dust transition-colors">Stormyvisions@yahoo.com</a>
              <div className="flex gap-6">
                <a href="tel:0796499728" className="text-sm text-gray-500 hover:text-rose-dust transition-colors">Candice · 079 649 9728</a>
                <a href="tel:0723264837" className="text-sm text-gray-500 hover:text-rose-dust transition-colors">Carmel · 072 326 4837</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Collections Accordion ────────────────────── */}
      <div id="candles" className="max-w-6xl mx-auto px-4 py-8">

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
                  transition: `height ${COLLAPSE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                  boxShadow:  isActive ? `0 0 0 2px ${col.color}` : 'none',
                }}
              >
                <img
                  src={col.banner}
                  alt={col.name}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  style={{
                    filter:     isActive ? 'brightness(1)' : 'brightness(0.4) saturate(0.5)',
                    transition: 'filter 0.5s ease',
                  }}
                />
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-12"
                       style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.3))' }} />
                )}
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
                  transition: `max-height ${isActive ? COLLAPSE_DURATION + 100 : COLLAPSE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
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
