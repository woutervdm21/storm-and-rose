// Storefront — hero, accordion collection banners, about section
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'
import Meta from '../components/Meta'
import { useCollection } from '../context/CollectionContext'

const COLLECTION_META = [
  // image: portrait poster used elsewhere (banners are rendered in HTML below)
  { slug: 'ember',  name: 'Ember',  tagline: 'Where warmth meets indulgence',               image: '/images/Ember.jpg',  color: '#C47D3E', rgb: '196,125,62', deepRgb: '139,69,19'  },
  { slug: 'roots',  name: 'Roots',  tagline: 'Rooted in natures beauty',                    image: '/images/Roots.jpg',  color: '#4A7C59', rgb: '74,124,89',  deepRgb: '45,90,61'   },
  { slug: 'tides',  name: 'Tides',  tagline: 'Flowing serenity, coastal tranquility',       image: '/images/Tides.jpg',  color: '#2E6B9E', rgb: '46,107,158', deepRgb: '26,74,114'  },
  { slug: 'zephyr', name: 'Zephyr', tagline: 'Lightness, elegance and uplifting fragrance', image: '/images/Zephyr.jpg', color: '#B8960C', rgb: '184,150,12', deepRgb: '138,112,10' },
]

// Collapse animation duration in ms — must match the CSS transition
const COLLAPSE_DURATION = 500

// Smooth scrolling is motion too — jump instead when the OS asks for less
const scrollBehavior = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

// Default Storm & Rose accent (shown when no collection is selected)
const DEFAULT_RGB = '183,110,121'

export default function Storefront() {
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState(false)
  const [flashSlug, setFlashSlug]   = useState(null)
  const [splash, setSplash]         = useState(null)
  const { collection, setCollection } = useCollection()
  const bannerRefs = useRef({})
  const splashTimer = useRef(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [{ data: prods, error: prodErr }, { data: cats, error: catErr }] = await Promise.all([
          supabase.from('products').select('*, categories(id, name), product_images(url, sort_order)'),
          supabase.from('categories').select('*').order('sort_order').order('name'),
        ])
        // a failed request must not look like an empty collection
        if (prodErr || catErr) throw prodErr ?? catErr
        setProducts(prods ?? [])
        setCategories(cats ?? [])
      } catch (err) {
        console.error('Failed to load products', err)
        setLoadError(true)
      } finally {
        // always clears the spinner, even when the request threw
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const categoryIdFor = (slug) =>
    categories.find(c => c.name.toLowerCase() === slug)?.id ?? null

  function selectCollection(slug, event) {
    // trigger click flash
    setFlashSlug(slug)
    setTimeout(() => setFlashSlug(null), 450)

    // colour splash rippling out from the click point — carries the colours
    // of the theme we're switching TO (default theme when collapsing)
    const collapsing = collection === slug
    const meta = COLLECTION_META.find(c => c.slug === slug)
    const rgb  = collapsing ? DEFAULT_RGB : meta.rgb
    const x = event?.clientX ?? window.innerWidth / 2
    const y = event?.clientY ?? window.innerHeight / 2
    // scale the 100px splash disc until it covers the furthest viewport corner
    const maxDist = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )
    clearTimeout(splashTimer.current)
    setSplash({ id: Date.now(), x, y, rgb, scale: (maxDist * 2) / 100 * 1.1 })
    splashTimer.current = setTimeout(() => setSplash(null), 1000)

    // clicking the active collection collapses it — no scroll needed
    if (collapsing) {
      setCollection(null)
      return
    }
    // only wait for a collapse when one is actually running, otherwise the
    // first click of a visit stalls for half a second before anything moves
    const wasOpen = collection !== null
    setCollection(slug)
    setTimeout(() => {
      const el = bannerRefs.current[slug]
      if (!el) return
      const navbarHeight = 68
      const top = el.getBoundingClientRect().top + window.pageYOffset - navbarHeight
      window.scrollTo({ top, behavior: scrollBehavior() })
    }, wasOpen ? COLLAPSE_DURATION + 20 : 0)
  }

  return (
    <main>
      <Meta />

      {/* ── Colour splash overlay — ripples out from the clicked banner ── */}
      {splash && (
        <div key={splash.id} className="fixed inset-0 pointer-events-none z-[60]" aria-hidden="true">
          <span
            className="splash-wave"
            style={{ left: splash.x, top: splash.y, backgroundColor: `rgb(${splash.rgb})`, '--splash-scale': splash.scale }}
          />
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────── */}
      <section
        id="home"
        className="relative overflow-hidden py-24 md:py-32 px-4 text-center
                   bg-col-bg dark:bg-col-bg-dark transition-colors duration-500"
      >
        {/* a single calm glow, rising from below */}
        <div className="hero-glow absolute inset-0 pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <img
            src="/images/Logo1.png"
            alt="Storm & Rose"
            className="h-20 w-20 object-contain mx-auto mb-10 opacity-95"
          />
          <p className="eyebrow mb-6 transition-colors duration-500">
            Handcrafted in Mpumalanga
          </p>
          <h1 className="font-serif text-6xl md:text-7xl mb-6 leading-[1.05]
                         text-rose-deep dark:text-cream transition-colors duration-500">
            Storm &amp; Rose
          </h1>
          <p className="text-base md:text-lg leading-relaxed max-w-md mx-auto mb-12
                        text-gray-600 dark:text-gray-400 transition-colors duration-300">
            Luxury candles and thoughtful designs, handcrafted with love.
          </p>
          <button
            onClick={() => {
              document.getElementById('candles')
                ?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
            }}
            className="btn-primary"
          >
            Explore Collections
          </button>
        </div>
        {/* hairline hands the eye down to the next section */}
        <div className="hairline absolute bottom-0 inset-x-0" />
      </section>

      {/* ── About Us — tinted band; hero's colour drips onto it ── */}
      <section id="about" className="relative bg-col-surface dark:bg-col-surface-dark transition-colors duration-500">
        <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="relative order-2 md:order-1">
            <div className="photo-shadow relative rounded-2xl overflow-hidden">
              <img src="/images/Rooibos.png" alt="Storm & Rose candles" className="w-full h-80 md:h-[26rem] object-cover" />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <p className="eyebrow mb-5 transition-colors duration-500">Our Story</p>
            <h2 className="font-serif text-4xl md:text-5xl leading-[1.1] mb-7
                           text-rose-deep dark:text-rose-dust transition-colors duration-500">
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
          </div>
        </div>
        </div>
      </section>

      {/* ── Collections — the About band's colour drips onto it ── */}
      <section className="relative bg-col-bg dark:bg-col-bg-dark transition-colors duration-500">
        <div id="candles" className="max-w-6xl mx-auto px-4 py-24 md:py-32">

        {/* section header */}
        <div className="mb-12">
          <p className="eyebrow mb-4 transition-colors duration-500">Our Collections</p>
          <h2 className="font-serif text-4xl md:text-5xl leading-[1.1]
                         text-rose-deep dark:text-cream transition-colors duration-500">
            Four moods, four worlds
          </h2>
        </div>

        {COLLECTION_META.map(col => {
          const isActive    = collection === col.slug
          const isFlashing  = flashSlug === col.slug
          const catId       = categoryIdFor(col.slug)
          const colProducts = products.filter(p => p.category_id === catId)

          return (
            <div key={col.slug} ref={el => bannerRefs.current[col.slug] = el} className="mb-3 last:mb-0">

              {/* ── Banner ── */}
              <div>
                <div
                  className={isFlashing ? 'banner-flash' : ''}
                  style={{ borderRadius: '12px', overflow: 'hidden' }}
                >
                  <button
                    onClick={(e) => selectCollection(col.slug, e)}
                    aria-expanded={isActive}
                    aria-controls={`panel-${col.slug}`}
                    className="group relative w-full overflow-hidden block
                               focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                               focus-visible:ring-rose-dust focus-visible:ring-offset-col-bg"
                    style={{
                      borderRadius: '16px',
                      height:       isActive ? '132px' : '88px',
                      backgroundColor: '#12100F',
                      transition:   `height ${COLLAPSE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                    }}
                  >
                    {/* collection-coloured wash, stronger when open */}
                    <div
                      className="absolute inset-0 transition-opacity duration-500"
                      style={{
                        opacity:    isActive ? 1 : 0.45,
                        background: `linear-gradient(105deg, rgba(${col.rgb}, 0.22) 0%, transparent 55%)`,
                      }}
                    />
                    {/* left accent bar — the only chrome the banner needs */}
                    <div
                      className="absolute left-0 top-0 bottom-0 transition-all duration-500"
                      style={{
                        width:           isActive ? '4px' : '3px',
                        backgroundColor: col.color,
                        opacity:         isActive ? 1 : 0.55,
                      }}
                    />
                    <div
                      className={`relative h-full flex items-center px-6 md:px-10 transition-opacity duration-500
                                  ${isActive ? 'opacity-100' : 'opacity-75 group-hover:opacity-100'}`}
                    >
                      <span
                        className="font-serif leading-none transition-all duration-500"
                        style={{
                          color:         col.color,
                          letterSpacing: '0.04em',
                          fontSize:      isActive ? 'clamp(2.1rem, 5vw, 2.9rem)' : 'clamp(1.5rem, 3.5vw, 1.9rem)',
                        }}
                      >
                        {col.name.toUpperCase()}
                      </span>
                      <span className="hidden md:block absolute left-1/2 -translate-x-1/2">
                        <span className="font-sans text-sm text-cream/70">
                          {col.tagline}
                        </span>
                      </span>
                    </div>
                    {/* click cue — pill reads as tappable on touch, where there is no hover */}
                    <div className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2">
                      <span
                        className="flex items-center gap-1.5 md:gap-2 rounded-full font-sans uppercase
                                   px-2.5 py-1.5 md:px-3.5 md:py-2
                                   text-[0.5rem] md:text-[0.6rem] tracking-[0.18em] md:tracking-[0.2em]
                                   transition-colors duration-500"
                        style={{
                          color:           col.color,
                          border:          `1px solid rgba(${col.rgb}, 0.45)`,
                          backgroundColor: `rgba(${col.rgb}, 0.08)`,
                        }}
                      >
                        {isActive ? 'Hide' : 'View candles'}
                        <svg
                          viewBox="0 0 16 16" fill="none"
                          className={`w-3.5 h-3.5 transition-transform duration-500 ${isActive ? 'rotate-180' : 'animate-bounce-soft'}`}
                          style={{ stroke: col.color }}
                        >
                          <path d="M3 6 L8 11 L13 6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* ── Products (only when active) ── */}
              <div
                id={`panel-${col.slug}`}
                role="region"
                aria-label={`${col.name} collection`}
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
                  {!loading && loadError && (
                    <div className="text-center py-12">
                      <p className="font-serif text-xl mb-1" style={{ color: col.color }}>
                        Something went wrong
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        We couldn&apos;t load the candles just now — please refresh to try again.
                      </p>
                    </div>
                  )}
                  {!loading && !loadError && colProducts.length === 0 && (
                    <div className="text-center py-12">
                      <p className="font-serif text-xl mb-1" style={{ color: col.color }}>Coming Soon</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No candles in this collection yet — check back soon.
                      </p>
                    </div>
                  )}
                  {!loading && !loadError && colProducts.length > 0 && (
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
      </section>

    </main>
  )
}
