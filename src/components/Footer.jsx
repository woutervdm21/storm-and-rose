// Site footer — brand info, contact, links — collection-themed
import { Link, useNavigate, useLocation } from 'react-router-dom'

export default function Footer() {
  const navigate = useNavigate()
  const location = useLocation()

  // Shop → the collections on the home page (navigate home first if needed)
  function goToCandles() {
    if (location.pathname === '/') {
      const el = document.getElementById('candles')
      const top = el.getBoundingClientRect().top + window.pageYOffset - 68
      window.scrollTo({ top, behavior: 'smooth' })
    } else {
      // ScrollManager scrolls once the collections have actually rendered
      navigate('/', { state: { scrollTo: 'candles' } })
    }
  }

  return (
    <footer id="contact" className="mt-20 bg-col-surface dark:bg-col-surface-dark transition-colors duration-500">
      {/* top accent line */}
      <div
        className="h-0.5 w-full"
        style={{
          background: `linear-gradient(to right, transparent, rgb(var(--col-primary-rgb)), rgb(var(--col-deep-rgb)), rgb(var(--col-primary-rgb)), transparent)`,
        }}
      />

      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-3 gap-10">

        {/* brand */}
        <div className="flex flex-col gap-3">
          <img src="/images/Logo1.png" alt="Storm & Rose" className="h-16 w-16 object-contain" />
          <p className="font-serif text-lg text-rose-deep dark:text-rose-dust transition-colors duration-500">Storm &amp; Rose</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Luxury Candles &amp; Thoughtful Designs,<br />Handcrafted with Love
          </p>
          <a
            href="https://www.stormoffaith.co.za"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-rose-mid dark:text-rose-dust
                       underline underline-offset-2 decoration-rose-dust/50
                       hover:text-rose-deep dark:hover:text-cream hover:decoration-current transition-colors"
          >
            A Storm of Faith venture
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6m4-3h6v6m-11 5L21 3" />
            </svg>
          </a>
        </div>

        {/* contact */}
        <div className="flex flex-col gap-3">
          <h3 className="font-serif text-rose-deep dark:text-rose-dust transition-colors duration-500">Contact</h3>
          <a href="mailto:Stormyvisions@yahoo.com" className="text-sm text-gray-600 dark:text-gray-400 hover:text-rose-dust transition-colors">
            Stormyvisions@yahoo.com
          </a>
          <a href="tel:0723264837" className="text-sm text-gray-600 dark:text-gray-400 hover:text-rose-dust transition-colors">
            Carmel · 072 326 4837
          </a>
          <a href="tel:0796499728" className="text-sm text-gray-600 dark:text-gray-400 hover:text-rose-dust transition-colors">
            Candice · 079 649 9728
          </a>
          <p className="text-sm text-gray-600 dark:text-gray-400">Mpumalanga<br />Witbank · Middelburg</p>
        </div>

        {/* links */}
        <div className="flex flex-col gap-3">
          <h3 className="font-serif text-rose-deep dark:text-rose-dust transition-colors duration-500">Quick Links</h3>
          <button onClick={goToCandles} className="text-left text-sm text-gray-600 dark:text-gray-400 hover:text-rose-dust transition-colors">Shop</button>
          <Link to="/cart"  className="text-sm text-gray-600 dark:text-gray-400 hover:text-rose-dust transition-colors">Cart</Link>

        </div>
      </div>

      <div className="border-t border-rose-dust/20 text-center py-4 text-xs text-gray-500 dark:text-gray-600 transition-colors duration-500">
        © {new Date().getFullYear()} Storm &amp; Rose. All rights reserved.
      </div>
    </footer>
  )
}
