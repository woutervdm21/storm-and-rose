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

// Default Storm & Rose theme colours (shown when no collection is selected)
const DEFAULT_RGB  = '183,110,121'
const DEFAULT_DEEP = '109,46,70'

// Silk-wave section separator. Sits at the top of a section and lets the
// PREVIOUS section's colour flow onto it (fillClass sets currentColor).
// Two layers: a translucent echo behind a solid wave, for a soft sense of depth.
function WaxDivider({ fillClass, flip = false }) {
  return (
    <div className={fillClass} aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <svg viewBox="0 0 1440 56" preserveAspectRatio="none" className="block w-full h-8 md:h-12">
        {/* translucent echo, drifting a little deeper */}
        <path
          fill="currentColor"
          opacity="0.35"
          d="M0,0 H1440 V22
             C1330,34 1240,46 1110,42
             C980,38 900,20 760,24
             C620,28 540,46 400,46
             C260,46 150,28 60,30
             C35,31 15,28 0,26
             Z"
        />
        <path
          fill="currentColor"
          d="M0,0 H1440 V18
             C1360,26 1280,34 1160,32
             C1020,30 940,14 800,16
             C660,18 580,36 440,36
             C300,36 180,22 80,24
             C50,25 20,22 0,18
             Z"
        />
      </svg>
    </div>
  )
}

export default function Storefront() {
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [flashSlug, setFlashSlug]   = useState(null)
  const [splash, setSplash]         = useState(null)
  const { collection, setCollection } = useCollection()
  const bannerRefs = useRef({})
  const splashTimer = useRef(null)

  useEffect(() => {
    async function fetchData() {
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase.from('products').select('*, categories(id, name), product_images(url, sort_order)'),
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

  function selectCollection(slug, event) {
    // trigger click flash
    setFlashSlug(slug)
    setTimeout(() => setFlashSlug(null), 450)

    // colour splash rippling out from the click point — carries the colours
    // of the theme we're switching TO (default theme when collapsing)
    const collapsing = collection === slug
    const meta = COLLECTION_META.find(c => c.slug === slug)
    const rgb  = collapsing ? DEFAULT_RGB  : meta.rgb
    const deep = collapsing ? DEFAULT_DEEP : meta.deepRgb
    const x = event?.clientX ?? window.innerWidth / 2
    const y = event?.clientY ?? window.innerHeight / 2
    // scale the 100px splash disc until it covers the furthest viewport corner
    const maxDist = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )
    clearTimeout(splashTimer.current)
    setSplash({ id: Date.now(), x, y, rgb, deep, scale: (maxDist * 2) / 100 * 1.1 })
    splashTimer.current = setTimeout(() => setSplash(null), 1300)

    // clicking the active collection collapses it — no scroll needed
    if (collapsing) {
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

      {/* ── Colour splash overlay — ripples out from the clicked banner ── */}
      {splash && (
        <div key={splash.id} className="fixed inset-0 pointer-events-none z-[60]" aria-hidden="true">
          <span
            className="splash-wave"
            style={{ left: splash.x, top: splash.y, backgroundColor: `rgb(${splash.rgb})`, '--splash-scale': splash.scale }}
          />
          <span
            className="splash-core"
            style={{ left: splash.x, top: splash.y, backgroundColor: `rgb(${splash.deep})`, '--splash-scale': splash.scale * 0.6 }}
          />
          <span
            className="splash-ring"
            style={{ left: splash.x, top: splash.y, borderColor: `rgb(${splash.rgb})`, '--splash-scale': splash.scale }}
          />
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────── */}
      <section
        id="home"
        className="relative overflow-hidden py-20 md:py-28 px-4 text-center
                   bg-col-bg dark:bg-col-bg-dark transition-colors duration-500"
      >
        {/* collection-coloured radial glow from above */}
        <div className="hero-glow-top absolute inset-0 pointer-events-none" />
        {/* candlelight rising from below — flickers like a live flame */}
        <div className="hero-glow-bottom candle-glow absolute inset-x-0 bottom-0 h-2/3 pointer-events-none" />
        <div className="grain absolute inset-0" />
        <div className="relative z-10 max-w-xl mx-auto">
          <img
            src="/images/Logo1.png"
            alt="Storm & Rose"
            className="h-36 w-36 object-contain mx-auto mb-6 opacity-90"
            style={{ filter: 'drop-shadow(0 0 26px rgb(var(--col-primary-rgb) / 0.5))' }}
          />
          <h1 className="font-serif text-5xl md:text-6xl mb-4 leading-tight
                         text-rose-deep dark:text-cream transition-colors duration-500">
            Storm &amp; Rose
          </h1>
          <div className="flex items-center gap-4 mb-8">
            <span className="flex-1 h-px bg-gradient-to-r from-transparent to-rose-dust/50 transition-colors duration-500" />
            <p className="text-base md:text-lg leading-relaxed
                          text-gray-600 dark:text-gray-400 transition-colors duration-300">
              Luxury Candles &amp; Thoughtful Designs,<br />Handcrafted with Love
            </p>
            <span className="flex-1 h-px bg-gradient-to-l from-transparent to-rose-dust/50 transition-colors duration-500" />
          </div>
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

      {/* ── About Us — tinted band; hero's colour drips onto it ── */}
      <section id="about" className="relative bg-col-surface dark:bg-col-surface-dark transition-colors duration-500">
        <WaxDivider fillClass="wax-fill-bg" />
        <div className="grain absolute inset-0" />
        <div className="relative max-w-6xl mx-auto px-4 pt-8 pb-16 md:pt-12 md:pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="relative order-2 md:order-1">
            {/* offset frame floating behind the photo */}
            <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl border-2 border-rose-dust/40 transition-colors duration-500" aria-hidden="true" />
            <div className="photo-shadow relative rounded-2xl overflow-hidden">
              <img src="/images/Rooibos.png" alt="Storm & Rose candles" className="w-full h-80 md:h-full object-cover" />
            </div>
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
          </div>
        </div>
        </div>
      </section>

      {/* ── Collections — the About band's colour drips onto it ── */}
      <section className="relative bg-col-bg dark:bg-col-bg-dark transition-colors duration-500">
        <WaxDivider fillClass="wax-fill-surface" flip />
        <div id="candles" className="max-w-6xl mx-auto px-4 pt-6 pb-12">

        {/* ornamental header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-rose-dust/50 transition-colors duration-500" />
          <span className="text-rose-dust/60 text-[0.5rem] transition-colors duration-500">◆</span>
          <span className="text-xs uppercase tracking-[0.3em] text-rose-dust font-semibold whitespace-nowrap transition-colors duration-500">
            Our Collections
          </span>
          <span className="text-rose-dust/60 text-[0.5rem] transition-colors duration-500">◆</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-rose-dust/50 transition-colors duration-500" />
        </div>

        {COLLECTION_META.map(col => {
          const isActive    = collection === col.slug
          const isFlashing  = flashSlug === col.slug
          const catId       = categoryIdFor(col.slug)
          const colProducts = products.filter(p => p.category_id === catId)

          return (
            <div key={col.slug} ref={el => bannerRefs.current[col.slug] = el} className="mb-2 last:mb-0">

              {/* ── Banner (with optional spinning ring when active) ── */}
              <div className={isActive ? 'banner-ring' : ''}>
                <div
                  className={isFlashing ? 'banner-flash' : ''}
                  style={{ borderRadius: '12px', overflow: 'hidden' }}
                >
                  <button
                    onClick={(e) => selectCollection(col.slug, e)}
                    className="group relative w-full overflow-hidden focus:outline-none block"
                    style={{
                      borderRadius: '12px',
                      height:       isActive ? '116px' : '72px',
                      backgroundColor: '#161210',
                      transition:   `height ${COLLAPSE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                    }}
                  >
                    {/* collection-coloured glow when active */}
                    <div
                      className="absolute inset-0 transition-opacity duration-500"
                      style={{
                        opacity:    isActive ? 1 : 0,
                        background: `radial-gradient(ellipse at 50% 130%, rgba(${col.rgb}, 0.35) 0%, transparent 70%)`,
                      }}
                    />
                    {/* thin poster-style frame */}
                    <div
                      className="absolute pointer-events-none transition-all duration-500"
                      style={{
                        inset:        '6px',
                        borderRadius: '8px',
                        border:       `1px solid rgba(${col.rgb}, ${isActive ? 0.7 : 0.3})`,
                      }}
                    />
                    <div
                      className={`relative h-full flex items-center px-6 md:px-10 transition-opacity duration-500
                                  ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-90'}`}
                    >
                      <span
                        className="font-serif leading-none transition-all duration-500"
                        style={{
                          color:         col.color,
                          letterSpacing: '0.1em',
                          fontSize:      isActive ? 'clamp(2rem, 5vw, 2.75rem)' : 'clamp(1.4rem, 3.5vw, 1.75rem)',
                        }}
                      >
                        {col.name.toUpperCase()}
                      </span>
                      <span className="hidden md:flex flex-col items-center gap-1 absolute left-1/2 -translate-x-1/2">
                        <span
                          className="text-[0.6rem] uppercase"
                          style={{ color: col.color, letterSpacing: '0.35em' }}
                        >
                          — Collection —
                        </span>
                        <span className="font-serif italic text-sm text-cream/80">
                          {col.tagline}
                        </span>
                      </span>
                    </div>
                    {/* click cue — "view candles" hint + chevron */}
                    <div className={`absolute right-4 md:right-6 top-1/2 -translate-y-1/2 flex items-center gap-2
                                     transition-opacity duration-500
                                     ${isActive ? 'opacity-90' : 'opacity-60 group-hover:opacity-100'}`}>
                      <span
                        className="hidden md:block text-[0.6rem] uppercase tracking-[0.2em] font-sans"
                        style={{ color: col.color }}
                      >
                        {isActive ? 'Hide' : 'View candles'}
                      </span>
                      <svg
                        viewBox="0 0 16 16" fill="none"
                        className={`w-4 h-4 transition-transform duration-500 ${isActive ? 'rotate-180' : 'animate-bounce-soft'}`}
                        style={{ stroke: col.color }}
                      >
                        <path d="M3 6 L8 11 L13 6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div
                      className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                      style={{
                        height:          isActive ? '3px' : '2px',
                        backgroundColor: col.color,
                        opacity:         isActive ? 1 : 0.4,
                      }}
                    />
                  </button>
                </div>
              </div>

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
      </section>

    </main>
  )
}
