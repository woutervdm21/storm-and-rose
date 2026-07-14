// Product card — collection-themed, add to cart without drilling into detail
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useCart } from '../context/CartContext'

export default function ProductCard({ product }) {
  const { addItem } = useCart()

  function handleAddToCart(e) {
    e.preventDefault() // don't follow the link if button is inside one
    addItem(product)
    toast.success(`${product.name} added to cart`)
  }

  return (
    <div className="group flex flex-col
                    bg-col-surface dark:bg-col-surface-dark
                    border border-rose-deep/20 dark:border-rose-dust/20
                    rounded-xl overflow-hidden
                    shadow-sm hover:shadow-md
                    transition-all duration-300">

      {/* image — click to view detail */}
      <Link to={`/products/${product.id}`} className="block overflow-hidden flex-shrink-0">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-52 bg-rose-dust/10 flex items-center justify-center
                          text-rose-deep/30 dark:text-rose-dust/30 text-sm">
            No image
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        {/* collection badge */}
        {product.categories?.name && (
          <span className="inline-block self-start text-xs
                           bg-rose-deep/10 dark:bg-rose-dust/15
                           text-rose-deep dark:text-rose-dust
                           px-2 py-0.5 rounded-full mb-2">
            {product.categories.name}
          </span>
        )}

        {/* name */}
        <Link to={`/products/${product.id}`}>
          <h2 className="font-serif text-lg leading-snug
                         text-rose-deep dark:text-rose-dust
                         hover:underline transition-colors duration-300">
            {product.name}
          </h2>
        </Link>

        {/* description */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 flex-1">
          {product.description}
        </p>

        {/* stock warning */}
        {product.stock === 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            Limited stock — delivery may be delayed
          </p>
        )}

        {/* price + add to cart */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-navy dark:text-cream">
              R {Number(product.price).toFixed(2)}
            </span>
            <Link
              to={`/products/${product.id}`}
              className="text-xs text-rose-deep/60 dark:text-rose-dust/60 hover:underline"
            >
              View details
            </Link>
          </div>

          {/* full-width Add to Cart — always visible, hard to miss */}
          <button
            onClick={handleAddToCart}
            className="btn-primary w-full py-2 text-sm"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  )
}
