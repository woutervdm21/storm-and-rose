// Cart page — shows items, quantity controls, per-line subtotals, and checkout link
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function Cart() {
  const { items, removeItem, updateQty, total } = useCart()

  if (items.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-24 text-center">
        <img src="/images/Logo1.png" alt="" className="h-20 w-20 object-contain mx-auto mb-6 opacity-40" />
        <p className="font-serif text-2xl text-rose-deep dark:text-rose-dust mb-2">Your cart is empty</p>
        <p className="text-gray-500 mb-6">Looks like you haven't added anything yet.</p>
        <Link to="/" className="btn-primary px-8 py-2.5">Browse Candles</Link>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust mb-8">Your Cart</h1>

      <ul className="divide-y divide-rose-dust/20">
        {items.map(item => (
          <li key={item.id} className="flex items-center gap-4 py-5">
            {/* thumbnail */}
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-18 h-18 w-16 h-16 object-cover rounded-xl flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-rose-dust/10 flex-shrink-0" />
            )}

            {/* name + price */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{item.name}</p>
              <p className="text-sm text-rose-mid">R {Number(item.price).toFixed(2)} each</p>
            </div>

            {/* quantity controls — matching ProductDetail style */}
            <div className="flex items-center border border-rose-dust/40 rounded-lg overflow-hidden">
              <button
                onClick={() => updateQty(item.id, item.qty - 1)}
                className="w-8 h-8 flex items-center justify-center hover:bg-rose-dust/10 transition-colors"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
              <button
                onClick={() => updateQty(item.id, item.qty + 1)}
                className="w-8 h-8 flex items-center justify-center hover:bg-rose-dust/10 transition-colors"
              >
                +
              </button>
            </div>

            {/* line subtotal */}
            <p className="w-20 text-right font-semibold text-sm">
              R {(item.price * item.qty).toFixed(2)}
            </p>

            {/* remove */}
            <button
              onClick={() => removeItem(item.id)}
              aria-label="Remove item"
              className="text-gray-400 hover:text-rose-deep dark:hover:text-rose-dust transition-colors ml-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {/* total + checkout */}
      <div className="mt-8 pt-6 border-t border-rose-dust/30 flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">Order total</p>
          <p className="text-2xl font-semibold">R {total.toFixed(2)}</p>
        </div>
        <Link to="/checkout" className="btn-primary py-3 px-8">
          Proceed to Checkout
        </Link>
      </div>
    </main>
  )
}
