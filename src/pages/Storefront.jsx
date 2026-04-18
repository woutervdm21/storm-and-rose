// Product listing page — hero banner + product grid
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'
import Meta from '../components/Meta'

export default function Storefront() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase.from('products').select('*')
      if (!error) setProducts(data)
      setLoading(false)
    }
    fetchProducts()
  }, [])

  return (
    <main>
      <Meta />
      {/* hero — rose tint in light mode, deep rose tint in dark to distinguish from page bg */}
      <section className="bg-rose-dust/15 dark:bg-rose-deep/20 py-16 px-4 text-center border-b border-rose-dust/20">
        <h1 className="font-serif text-4xl md:text-5xl text-rose-deep dark:text-rose-dust mb-3">
          Storm &amp; Rose
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg max-w-md mx-auto">
          Luxury Candles &amp; Thoughtful Designs, Handcrafted with Love
        </p>
      </section>

      {/* product grid */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="font-serif text-2xl text-rose-deep dark:text-rose-dust mb-8">Our Candles</h2>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-rose-dust border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && products.length === 0 && (
          <p className="text-center text-gray-500 py-20">No products available yet.</p>
        )}

        {!loading && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
