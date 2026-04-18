// Product card used in the storefront grid — links to product detail page
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useCart } from '../context/CartContext'

export default function ProductCard({ product }) {
  const { addItem } = useCart()

  return (
    <div className="group bg-cream dark:bg-navy border border-rose-dust/20 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* product image */}
      <Link to={`/products/${product.id}`}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-56 bg-rose-dust/20 flex items-center justify-center text-rose-dust/50 text-sm">
            No image
          </div>
        )}
      </Link>

      <div className="p-4">
        <Link to={`/products/${product.id}`}>
          <h2 className="font-serif text-lg text-rose-deep dark:text-rose-dust hover:underline">{product.name}</h2>
        </Link>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{product.description}</p>

        {/* low stock notice — shown but ordering still allowed */}
        {product.stock === 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            Limited stock — delivery may be delayed
          </p>
        )}

        <div className="flex items-center justify-between mt-3">
          <span className="font-semibold">R {Number(product.price).toFixed(2)}</span>
          <button
            onClick={() => { addItem(product); toast.success(`${product.name} added to cart`) }}
            className="text-sm bg-rose-deep hover:bg-rose-mid text-cream px-4 py-1.5 rounded-lg transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  )
}
