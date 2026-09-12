// Top navigation — wordmark, nav links, cart, dark/light toggle
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useTheme } from '../context/ThemeContext'

// Scrolls to a section id on the home page; navigates home first if needed
function useScrollTo() {
  const navigate  = useNavigate()
  const location  = useLocation()

  return function scrollTo(sectionId) {
    const scroll = () => {
      if (!sectionId) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      const el = document.getElementById(sectionId)
      if (el) {
        const top = el.getBoundingClientRect().top + window.pageYOffset - 68
        window.scrollTo({ top, behavior: 'smooth' })
      }
    }
    if (location.pathname === '/') {
      scroll()
    } else {
      navigate('/')
      setTimeout(scroll, 300)
    }
  }
}

export default function Navbar() {
  const { items }          = useCart()
  const { dark, toggle }   = useTheme()
  const scrollTo  = useScrollTo()
  const cartCount = items.reduce((sum, i) => sum + i.qty, 0)

  const linkClass = 'text-[0.8rem] font-medium text-navy/80 dark:text-cream/80 hover:text-rose-deep dark:hover:text-rose-dust transition-colors duration-300'

  return (
    // backgroundImage is a flat wash of the collection colour laid over the
    // translucent surface — enough tint to read as coloured, sheer enough
    // that the blur still shows through
    <header
      className="sticky top-0 z-50 backdrop-blur-md border-b border-rose-dust/25
                 bg-col-surface/80 dark:bg-col-surface-dark/80 transition-colors duration-500"
      style={{
        backgroundImage:
          'linear-gradient(rgb(var(--col-primary-rgb) / 0.14), rgb(var(--col-primary-rgb) / 0.14))',
      }}
    >
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* wordmark */}
        <Link to="/" className="flex-shrink-0">
          <span className="font-serif text-lg sm:text-xl text-rose-deep dark:text-cream tracking-tight transition-colors duration-500">
            Storm &amp; Rose
          </span>
        </Link>

        {/* centre nav links */}
        <div className="hidden md:flex items-center gap-6">
          <button onClick={() => scrollTo(null)}           className={linkClass}>Home</button>
          <button onClick={() => scrollTo('about')}       className={linkClass}>About Us</button>
          <button onClick={() => scrollTo('candles')}     className={linkClass}>Candles</button>
          {/* footer renders on every page, so scroll directly — no need to go home first */}
          <button
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            className={linkClass}
          >
            Contact
          </button>
        </div>

        {/* right actions */}
        <div className="flex items-center gap-4">
          {/* cart */}
          <Link to="/cart" className="relative text-navy dark:text-cream hover:text-rose-deep dark:hover:text-rose-dust transition-colors">
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
          <button onClick={toggle} aria-label="Toggle dark mode"
            className="text-navy dark:text-cream hover:text-rose-deep dark:hover:text-rose-dust transition-colors">
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
        </div>
      </nav>
    </header>
  )
}
