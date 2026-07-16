// Product card — collection-themed, add to cart without drilling into detail
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useCart } from '../context/CartContext'
import { freeDeliveryMessage } from '../lib/fulfillment'

export default function ProductCard({ product }) {
  const { addItem, total } = useCart()
  const [imgIndex, setImgIndex] = useState(0)

  // all product photos in order, falling back to the legacy single image_url
  const images = product.product_images?.length
    ? [...product.product_images].sort((a, b) => a.sort_order - b.sort_order).map(img => img.url)
    : (product.image_url ? [product.image_url] : [])

  // gentle auto-crossfade when the product has more than one photo
  useEffect(() => {
    if (images.length < 2) return
    const t = setInterval(() => setImgIndex(i => (i + 1) % images.length), 4000)
    return () => clearInterval(t)
  }, [images.length])

  function handleAddToCart(e) {
    e.preventDefault() // don't follow the link if button is inside one
    addItem(product)
    // toast includes how far the new cart total is from free delivery
    toast.success(`${product.name} added to cart`, {
      description: freeDeliveryMessage(total + Number(product.price)),
    })
  }

  return (
    <div className="group flex flex-col
                    bg-col-surface dark:bg-col-surface-dark
                    border border-rose-deep/20 dark:border-rose-dust/20
                    rounded-xl overflow-hidden
                    shadow-sm hover:shadow-md
                    transition-all duration-300">

      {/* image — click to view detail; crossfades through photos when >1 */}
      <Link to={`/products/${product.id}`} className="relative block overflow-hidden flex-shrink-0">
        {images.length > 0 ? (
          <>
            <div className="relative w-full h-52 group-hover:scale-105 transition-transform duration-300">
              {images.map((url, i) => (
                <img
                  key={url}
                  src={url}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                  style={{ opacity: i === imgIndex ? 1 : 0 }}
                />
              ))}
            </div>
            {images.length > 1 && (
              <>
                {/* prev / next arrows — inside the detail Link, so swallow the click */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgIndex(i => (i - 1 + images.length) % images.length) }}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full
                             bg-black/35 hover:bg-black/55 text-cream backdrop-blur-sm
                             flex items-center justify-center transition-all
                             md:opacity-0 md:group-hover:opacity-100"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgIndex(i => (i + 1) % images.length) }}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full
                             bg-black/35 hover:bg-black/55 text-cream backdrop-blur-sm
                             flex items-center justify-center transition-all
                             md:opacity-0 md:group-hover:opacity-100"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1 rounded-full bg-cream transition-all duration-300
                                  ${i === imgIndex ? 'w-3 opacity-90' : 'w-1 opacity-50'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
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
