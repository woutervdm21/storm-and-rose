// Storefront — hero, about section, collection selector + product grid
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'
import Meta from '../components/Meta'
import { useCollection } from '../context/CollectionContext'
import { useTheme } from '../context/ThemeContext'

// category = the name of the matching row in the Supabase `categories` table.
// hideWhenEmpty = the card is only rendered once products are assigned to it.
const COLLECTION_META = [
  { slug: 'ember',   category: 'ember',           name: 'Ember',           tagline: 'Where warmth meets indulgence',               color: '#C47D3E', rgb: '196,125,62', deepRgb: '139,69,19'  },
  { slug: 'roots',   category: 'roots',           name: 'Roots',           tagline: 'Rooted in natures beauty',                    color: '#4A7C59', rgb: '74,124,89',  deepRgb: '45,90,61'   },
  { slug: 'tides',   category: 'tides',           name: 'Tides',           tagline: 'Flowing serenity, coastal tranquility',       color: '#2E6B9E', rgb: '46,107,158', deepRgb: '26,74,114'  },
  { slug: 'zephyr',  category: 'zephyr',          name: 'Zephyr',          tagline: 'Lightness, elegance and uplifting fragrance', color: '#B8960C', rgb: '184,150,12', deepRgb: '138,112,10' },
  // no [data-collection="limited"] block in index.css, so selecting it falls
  // back to the :root rose/plum defaults — the Storm & Rose house colours
  { slug: 'limited', category: 'limited edition', name: 'Limited Edition', tagline: 'Here for a season, not forever',              color: '#B76E79', rgb: '183,110,121', deepRgb: '109,46,70',  hideWhenEmpty: true },
]

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
  const [sortBy, setSortBy]         = useState('newest')
  const [splash, setSplash]         = useState(null)
  const { collection, setCollection } = useCollection()
  const { dark } = useTheme()
  const gridRef = useRef(null)
  const splashTimer = useRef(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [{ data: prods, error: prodErr }, { data: cats, error: catErr }] = await Promise.all([
          supabase.from('products').select('*, categories(id, name), product_images(url, sort_order, label)'),
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

  const categoryIdFor = (meta) =>
    categories.find(c => c.name.toLowerCase() === meta.category)?.id ?? null

  const countFor = (meta) =>
    products.filter(p => p.category_id === categoryIdFor(meta)).length

  // seasonal collections stay hidden until they actually have stock
  const shownCollections = COLLECTION_META.filter(
    meta => !meta.hideWhenEmpty || countFor(meta) > 0
  )

  const activeMeta = COLLECTION_META.find(c => c.slug === collection) ?? null

  // if the seasonal collection empties out while it is selected, its card
  // disappears — drop the filter so the grid doesn't strand the visitor
  useEffect(() => {
    if (loading || !activeMeta?.hideWhenEmpty) return
    if (countFor(activeMeta) === 0) setCollection(null)
  }, [loading, activeMeta, products, categories])

  // with nothing selected the grid shows the whole catalogue, so products are
  // never hidden behind a control the visitor has to find first
  const filtered = activeMeta
    ? products.filter(p => p.category_id === categoryIdFor(activeMeta))
    : products

  const SORTS = {
    newest:     (a, b) => new Date(b.created_at) - new Date(a.created_at),
    price_asc:  (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    name:       (a, b) => a.name.localeCompare(b.name),
  }

  const shownProducts = [...filtered].sort(SORTS[sortBy])

  function selectCollection(slug, event) {
    // trigger click flash
    setFlashSlug(slug)
    setTimeout(() => setFlashSlug(null), 450)

    // colour splash rippling out from the click point — carries the colour
    // of the theme we're switching TO (default theme when clearing)
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

    // clicking the active collection clears the filter back to everything
    setCollection(collapsing ? null : slug)

    // the grid usually sits right below the cards and needs no scrolling;
    // only pull it up when the change would otherwise happen off-screen
    const el = gridRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.top > window.innerHeight - 140) {
      const navbarHeight = 68
      window.scrollTo({
        top: rect.top + window.pageYOffset - navbarHeight - 24,
        behavior: scrollBehavior(),
      })
    }
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
            className="h-40 w-40 object-contain mx-auto mb-10 opacity-95"
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
              <img src="/images/AboutUsSample.jpg" alt="A handcrafted Storm & Rose flower candle bouquet" className="w-full h-80 md:h-[30rem] object-cover" />
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
                Storm &amp; Rose is a mother-and-daughter candle business born from our shared love of creativity, beautiful fragrances, and handcrafted treasures.
              </p>
              <p>
                We create luxury soy blend candles that are anything but ordinary. Each candle is hand-poured with care using quality wax blends and premium fragrances — designed not only to fill your space with beautiful scent, but to become part of the experience.
              </p>
              <p>
                From candles that look almost too delicious to burn, to beautiful designs inspired by bouquets of flowers, we love creating pieces that are unique, imaginative, and made to stand out.
              </p>
              <p>
                Our four collections — Ember, Roots, Tides, and Zephyr — each capture a different mood and tell a different story.
              </p>
              {/* sign-off, set apart from the body copy */}
              <p className="font-serif italic text-lg text-collection pt-2">
                Handcrafted with love. Created to be remembered.
              </p>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* ── Collections — the About band's colour drips onto it ── */}
      <section className="relative bg-col-bg dark:bg-col-bg-dark transition-colors duration-500">
        <div id="candles" className="max-w-6xl mx-auto px-4 py-24 md:py-32">

        {/* section header — same weight as the About heading */}
        <div className="mb-10">
          <h2 className="font-serif text-4xl md:text-5xl leading-[1.1]
                         text-rose-deep dark:text-cream transition-colors duration-500">
            Our Collections
          </h2>
        </div>

        {/* ── Collection selector ── */}
        <div className={`grid grid-cols-2 gap-3 md:gap-4 mb-16
                         ${shownCollections.length > 4 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
          {shownCollections.map(col => {
            const isActive   = collection === col.slug
            const isFlashing = flashSlug === col.slug
            const count      = countFor(col)
            // the collection colour is too light on cream and too dark on
            // near-black, so each theme takes the tone that reads against it
            const nameColor  = dark ? col.color : `rgb(${col.deepRgb})`

            return (
              <button
                key={col.slug}
                onClick={(e) => selectCollection(col.slug, e)}
                aria-pressed={isActive}
                aria-controls="collection-grid"
                className={`${isFlashing ? 'banner-flash' : ''}
                           group relative overflow-hidden text-left rounded-2xl
                           p-5 md:p-6 min-h-[9.5rem] md:min-h-[11rem] flex flex-col
                           transition-[transform,box-shadow,border-color] duration-300
                           hover:-translate-y-0.5
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                           focus-visible:ring-rose-dust focus-visible:ring-offset-col-bg`}
                style={{
                  border:     `1px solid rgba(${col.rgb}, ${isActive ? 0.85 : 0.28})`,
                  background: `linear-gradient(158deg, rgba(${col.rgb}, ${isActive ? 0.26 : 0.11}) 0%, rgba(${col.rgb}, 0.03) 70%)`,
                  boxShadow:  isActive ? `0 12px 32px -18px rgba(${col.rgb}, 0.9)` : 'none',
                }}
              >
                {/* count sits top-right, quiet until the card is chosen */}
                <span
                  className="absolute top-5 right-5 md:top-6 md:right-6 font-sans text-[0.65rem] tabular-nums
                             transition-opacity duration-300"
                  style={{ color: nameColor, opacity: isActive ? 0.85 : 0.5 }}
                >
                  {loading ? '' : count}
                </span>

                <h3
                  className="font-serif text-2xl md:text-[1.75rem] leading-none mb-2 transition-colors duration-500"
                  style={{ color: nameColor }}
                >
                  {col.name}
                </h3>
                <p className="font-sans text-[0.8rem] leading-snug text-gray-600 dark:text-gray-400 mb-auto">
                  {col.tagline}
                </p>

                {/* state line — says what a click will do, on touch as well as hover */}
                <span
                  className="font-sans text-[0.6rem] uppercase tracking-[0.18em] mt-4 flex items-center gap-1.5
                             transition-opacity duration-300"
                  style={{ color: nameColor, opacity: isActive ? 1 : 0.65 }}
                >
                  {isActive ? 'Showing' : 'View'}
                  <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3"
                       style={{ stroke: nameColor }}>
                    {isActive
                      ? <path d="M3 8 L7 12 L13 4" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      : <path d="M6 3 L11 8 L6 13" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />}
                  </svg>
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Products ── */}
        <div ref={gridRef} id="collection-grid" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-3 mb-8 pb-5 border-b border-rose-dust/20">
            <h3 className="font-serif text-2xl md:text-3xl text-rose-deep dark:text-cream transition-colors duration-500">
              {activeMeta ? activeMeta.name : 'All candles'}
              <span className="font-sans text-sm text-gray-500 dark:text-gray-400 ml-3">
                {shownProducts.length}
              </span>
            </h3>

            <div className="flex items-center gap-4">
              {/* the collection cards do the filtering, so order is what is left */}
              <label className="flex items-center gap-2">
                <span className="sr-only">Sort candles by</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="font-sans text-xs rounded-lg px-2.5 py-1.5 cursor-pointer
                             border border-rose-dust/40 bg-transparent
                             focus:outline-none focus:border-rose-deep transition-colors"
                >
                  <option value="newest">Newest first</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                  <option value="name">Name: A–Z</option>
                </select>
              </label>

              {/* clearing the filter is its own control, not a second click on the card */}
              {activeMeta && (
                <button
                  onClick={(e) => selectCollection(activeMeta.slug, e)}
                  className="font-sans text-[0.65rem] uppercase tracking-[0.18em] text-collection
                             hover:opacity-70 transition-opacity whitespace-nowrap"
                >
                  Show all
                </button>
              )}
            </div>
          </div>

          {loading && (
            <div className="flex justify-center py-20">
              <div className="w-7 h-7 border-2 border-rose-dust border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && loadError && (
            <div className="text-center py-20">
              <p className="font-serif text-xl text-rose-deep dark:text-rose-dust mb-1">
                Something went wrong
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                We couldn&apos;t load the candles just now — please refresh to try again.
              </p>
            </div>
          )}

          {!loading && !loadError && shownProducts.length === 0 && (
            <div className="text-center py-20">
              <p className="font-serif text-xl text-rose-deep dark:text-rose-dust mb-1">Coming Soon</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No candles in this collection yet — check back soon.
              </p>
            </div>
          )}

          {!loading && !loadError && shownProducts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {shownProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        </div>
      </section>

    </main>
  )
}
