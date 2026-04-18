// Site footer — brand info and contact details
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="mt-20 border-t-4 border-rose-mid bg-navy text-cream">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-3 gap-10">

        {/* brand */}
        <div className="flex flex-col gap-3">
          <img src="/images/Logo1.png" alt="Storm & Rose" className="h-16 w-16 object-contain" />
          <p className="font-serif text-lg text-rose-dust">Storm &amp; Rose</p>
          <p className="text-sm text-gray-400 leading-relaxed">
            Luxury Candles &amp; Thoughtful Designs,<br />Handcrafted with Love
          </p>
          <p className="text-xs text-gray-500">A Storm of Faith venture</p>
        </div>

        {/* contact */}
        <div className="flex flex-col gap-3">
          <h3 className="font-serif text-rose-dust">Contact</h3>
          <a href="mailto:Stormyvisions@yahoo.com" className="text-sm text-gray-400 hover:text-rose-dust transition-colors">
            Stormyvisions@yahoo.com
          </a>
          <a href="tel:0723264837" className="text-sm text-gray-400 hover:text-rose-dust transition-colors">
            072 326 4837
          </a>
          <a href="tel:0796499728" className="text-sm text-gray-400 hover:text-rose-dust transition-colors">
            079 649 9728
          </a>
          <p className="text-sm text-gray-400">Mpumalanga<br />Witbank · Middelburg</p>
        </div>

        {/* links */}
        <div className="flex flex-col gap-3">
          <h3 className="font-serif text-rose-dust">Quick Links</h3>
          <Link to="/"       className="text-sm text-gray-400 hover:text-rose-dust transition-colors">Shop</Link>
          <Link to="/cart"   className="text-sm text-gray-400 hover:text-rose-dust transition-colors">Cart</Link>
          <Link to="/admin"  className="text-sm text-gray-400 hover:text-rose-dust transition-colors">Admin</Link>
        </div>
      </div>

      <div className="border-t border-rose-dust/20 text-center py-4 text-xs text-gray-600">
        © {new Date().getFullYear()} Storm &amp; Rose. All rights reserved.
      </div>
    </footer>
  )
}
