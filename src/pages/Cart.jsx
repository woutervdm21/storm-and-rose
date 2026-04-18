// Cart page — shows items, allows quantity changes and removal, links to checkout
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function Cart() {
  const { items, removeItem, updateQty, total } = useCart()

  if (items.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-lg mb-4">Your cart is empty.</p>
        <Link to="/" className="text-rose-mid hover:underline">Browse candles</Link>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust mb-8">Your Cart</h1>

      <ul className="divide-y divide-rose-dust/30">
        {items.map(item => (
          <li key={item.id} className="flex items-center gap-4 py-4">
            {/* product image thumbnail */}
            {item.image_url && (
              <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
            )}

            <div className="flex-1">
              <p className="font-semibold">{item.name}</p>
              <p className="text-sm text-rose-mid">R {Number(item.price).toFixed(2)}</p>
            </div>

            {/* quantity controls */}
            <div className="flex items-center gap-2">
              <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 border border-rose-dust rounded hover:bg-rose-dust/20">−</button>
              <span className="w-6 text-center">{item.qty}</span>
              <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 border border-rose-dust rounded hover:bg-rose-dust/20">+</button>
            </div>

            <button
              onClick={() => removeItem(item.id)}
              className="text-sm text-rose-mid hover:text-rose-deep ml-2"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {/* order total and checkout link */}
      <div className="mt-8 flex justify-between items-center">
        <p className="text-xl font-semibold">Total: R {total.toFixed(2)}</p>
        <Link
          to="/checkout"
          className="bg-rose-deep hover:bg-rose-mid text-cream font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Proceed to Checkout
        </Link>
      </div>
    </main>
  )
}
