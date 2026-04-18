// Top navigation bar — logo, cart link, dark/light toggle, admin link
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useTheme } from '../context/ThemeContext'

export default function Navbar() {
  const { items } = useCart()
  const { dark, toggle } = useTheme()

  const cartCount = items.reduce((sum, i) => sum + i.qty, 0)

  return (
    <header className="border-b border-rose-dust/30 bg-cream dark:bg-navy transition-colors">
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* logo */}
        <Link to="/" className="flex items-center gap-3">
          <img src="/images/Logo1.jpg" alt="Storm & Rose" className="h-9 w-9 rounded-full object-cover" />
          <span className="font-serif text-lg text-rose-deep dark:text-rose-dust tracking-wide hidden sm:block">
            Storm &amp; Rose
          </span>
        </Link>

        <div className="flex items-center gap-5">
          {/* cart */}
          <Link to="/cart" className="relative text-navy dark:text-cream hover:text-rose-deep dark:hover:text-rose-dust transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9m-6-4a1 1 0 100 2 1 1 0 000-2zm-4 0a1 1 0 100 2 1 1 0 000-2z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-deep text-cream text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
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
              // sun icon — switch to light
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.7.7M6.34 17.66l-.7.7m12.73 0-.7-.7M6.34 6.34l-.7-.7M12 7a5 5 0 100 10A5 5 0 0012 7z" />
              </svg>
            ) : (
              // moon icon — switch to dark
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
              </svg>
            )}
          </button>

          {/* admin link */}
          <Link to="/admin" className="text-xs text-rose-mid hover:text-rose-deep dark:hover:text-rose-dust transition-colors">
            Admin
          </Link>
        </div>
      </nav>
    </header>
  )
}
