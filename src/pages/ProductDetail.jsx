// Single product page — fetches product by ID and allows adding to cart
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../context/CartContext'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

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

  function handleAddToCart() {
    addItem(product)
    navigate('/cart')
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* product image */}
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full rounded-xl object-cover shadow-md"
          />
        )}

        {/* product info */}
        <div className="flex flex-col gap-4">
          <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust">{product.name}</h1>
          <p className="text-lg font-semibold">R {Number(product.price).toFixed(2)}</p>
          <p className="leading-relaxed">{product.description}</p>

          <button
            onClick={handleAddToCart}
            className="mt-auto bg-rose-deep hover:bg-rose-mid text-cream font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </main>
  )
}
