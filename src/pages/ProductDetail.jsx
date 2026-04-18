// Single product page — full detail view with quantity selector and cart feedback
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useCart } from '../context/CartContext'

export default function ProductDetail() {
  const { id } = useParams()
  const { addItem, items } = useCart()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty]         = useState(1)
  const [added, setAdded]     = useState(false)

  useEffect(() => {
    async function fetchProduct() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()
      if (!error) setProduct(data)
      setLoading(false)
    }
    fetchProduct()
  }, [id])

  if (loading) return <p className="p-8 text-center">Loading...</p>
  if (!product) return <p className="p-8 text-center">Product not found.</p>

  // how many of this product are already in the cart
  const inCart = items.find(i => i.id === product.id)?.qty ?? 0

  function handleAddToCart() {
    for (let i = 0; i < qty; i++) addItem(product)
    setAdded(true)
    toast.success(`${qty > 1 ? `${qty}× ` : ''}${product.name} added to cart`)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">

      {/* breadcrumb */}
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-rose-mid hover:text-rose-deep dark:hover:text-rose-dust transition-colors mb-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to shop
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">

        {/* product image */}
        <div className="rounded-2xl overflow-hidden shadow-lg bg-rose-dust/10">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full object-cover aspect-square"
            />
          ) : (
            <div className="aspect-square flex items-center justify-center text-rose-dust/40 text-sm">
              No image
            </div>
          )}
        </div>

        {/* product info */}
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="font-serif text-4xl text-rose-deep dark:text-rose-dust leading-tight">{product.name}</h1>
            <p className="text-2xl font-semibold mt-3">R {Number(product.price).toFixed(2)}</p>
          </div>

          <p className="leading-relaxed text-gray-600 dark:text-gray-300">{product.description}</p>

          {/* stock notice */}
          {product.stock === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/30 rounded-lg px-4 py-2">
              Limited stock — delivery may be delayed
            </p>
          ) : (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {product.stock} in stock
            </p>
          )}

          {/* quantity selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Quantity</span>
            <div className="flex items-center border border-rose-dust/40 rounded-lg overflow-hidden">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-9 h-9 flex items-center justify-center hover:bg-rose-dust/10 transition-colors text-lg"
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-semibold">{qty}</span>
              <button
                onClick={() => setQty(q => q + 1)}
                className="w-9 h-9 flex items-center justify-center hover:bg-rose-dust/10 transition-colors text-lg"
              >
                +
              </button>
            </div>
          </div>

          {/* add to cart button — shows feedback on click */}
          <button
            onClick={handleAddToCart}
            className={`py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${
              added
                ? 'bg-emerald-500 text-white'
                : 'bg-rose-deep hover:bg-rose-mid text-cream'
            }`}
          >
            {added ? '✓ Added to Cart' : 'Add to Cart'}
          </button>

          {/* cart shortcut shown when items already added */}
          {inCart > 0 && !added && (
            <Link to="/cart" className="text-sm text-center text-rose-mid hover:underline">
              {inCart} already in cart — view cart
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
