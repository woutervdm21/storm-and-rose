// Top navigation — logo, cart, dark/light toggle, collection badge, admin link
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useTheme } from '../context/ThemeContext'
import { useCollection } from '../context/CollectionContext'

const COLLECTION_LABELS = {
  ember:  'Ember',
  roots:  'Roots',
  tides:  'Tides',
  zephyr: 'Zephyr',
}

export default function Navbar() {
  const { items }                    = useCart()
  const { dark, toggle }             = useTheme()
  const { collection }               = useCollection()
  const cartCount = items.reduce((sum, i) => sum + i.qty, 0)
  const label = COLLECTION_LABELS[collection] ?? 'Ember'

  return (
    <header className="sticky top-0 z-50 bg-col-surface dark:bg-col-surface-dark transition-colors duration-500 shadow-sm">
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* logo + brand name */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <img src="/images/Logo1.png" alt="Storm & Rose" className="h-12 w-12 object-contain" />
          <span className="font-serif text-lg text-rose-deep tracking-wide hidden sm:block transition-colors duration-500">
            Storm &amp; Rose
          </span>
        </Link>

        {/* active collection badge — clearly visible */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-rose-dust/30 bg-col-bg dark:bg-col-bg-dark transition-colors duration-500">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-500"
            style={{ backgroundColor: `rgb(var(--col-primary-rgb))` }}
          />
          <span className="text-xs font-medium text-rose-deep dark:text-rose-dust tracking-wide transition-colors duration-500">
            {label} Collection
          </span>
        </div>

        {/* right actions */}
        <div className="flex items-center gap-4">
          {/* cart */}
          <Link
            to="/cart"
            className="relative text-navy dark:text-cream hover:text-rose-deep dark:hover:text-rose-dust transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9m-6-4a1 1 0 100 2 1 1 0 000-2zm-4 0a1 1 0 100 2 1 1 0 000-2z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-deep text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center transition-colors duration-500">
                {cartCount}
              </span>
            )}
          </Link>

          {/* dark/light toggle */}
          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="text-navy dark:text-cream hover:text-rose-deep dark:hover:text-rose-dust transition-colors"
          >
            {dark ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.7.7M6.34 17.66l-.7.7m12.73 0-.7-.7M6.34 6.34l-.7-.7M12 7a5 5 0 100 10A5 5 0 0012 7z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
              </svg>
            )}
          </button>

          {/* admin */}
          <Link
            to="/admin"
            className="text-xs text-rose-mid hover:text-rose-deep dark:hover:text-rose-dust transition-colors"
          >
            Admin
          </Link>
        </div>
      </nav>

      {/* collection accent line — the most visible indicator of which collection is active */}
      <div
        className="h-0.5 w-full transition-all duration-500"
        style={{
          background: `linear-gradient(to right, transparent, rgb(var(--col-primary-rgb)), rgb(var(--col-deep-rgb)), rgb(var(--col-primary-rgb)), transparent)`,
        }}
      />
    </header>
  )
}
