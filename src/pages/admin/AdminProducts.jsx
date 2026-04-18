// Admin product management — list, create, edit, delete products and upload images
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'

const EMPTY_FORM = { name: '', description: '', price: '', stock: '' }
const BUCKET = 'product-images'

export default function AdminProducts() {
  const [products, setProducts]   = useState([])
  const [form, setForm]           = useState(EMPTY_FORM)
  const [editId, setEditId]       = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    setProducts(data ?? [])
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    let image_url = form.image_url ?? null

    // upload new image if one was selected
    if (imageFile) {
      const fileName = `${Date.now()}-${imageFile.name}`
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(fileName, imageFile)
      if (uploadError) { toast.error('Image upload failed.'); setError('Image upload failed.'); setLoading(false); return }
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName)
      image_url = urlData.publicUrl
    }

    const payload = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock), image_url }

    if (editId) {
      await supabase.from('products').update(payload).eq('id', editId)
      toast.success(`${form.name} updated`)
    } else {
      await supabase.from('products').insert(payload)
      toast.success(`${form.name} added`)
    }

    setForm(EMPTY_FORM)
    setEditId(null)
    setImageFile(null)
    setLoading(false)
    loadProducts()
  }

  function startEdit(product) {
    setEditId(product.id)
    setForm({ name: product.name, description: product.description, price: product.price, stock: product.stock, image_url: product.image_url })
    // scroll form into view so the user can see the pre-filled fields
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(id, name) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    toast.success(`${name} deleted`)
    loadProducts()
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust mb-8">Products</h1>

      {/* create / edit form — highlighted in rose when editing */}
      <form
        onSubmit={handleSubmit}
        className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12 p-6 rounded-xl border transition-colors ${
          editId
            ? 'border-rose-deep bg-rose-dust/10'
            : 'border-rose-dust/20 bg-transparent'
        }`}
      >
        {editId && (
          <p className="sm:col-span-2 text-sm font-semibold text-rose-deep dark:text-rose-dust">
            Editing product
          </p>
        )}

        <input name="name"        placeholder="Product name"    required value={form.name}        onChange={handleChange} className="input-field" />
        <input name="price"       placeholder="Price (R)"       required type="number" step="0.01" value={form.price}  onChange={handleChange} className="input-field" />
        <input name="stock"       placeholder="Stock qty"       required type="number" value={form.stock}       onChange={handleChange} className="input-field" />
        <input name="description" placeholder="Description"     value={form.description} onChange={handleChange} className="input-field sm:col-span-2" />

        <div className="sm:col-span-2 flex items-center gap-4">
          <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="text-sm flex-1" />
          {/* show current image thumbnail when editing */}
          {editId && form.image_url && !imageFile && (
            <img src={form.image_url} alt="current" className="h-12 w-12 object-cover rounded-lg border border-rose-dust/30" />
          )}
        </div>

        {error && <p className="text-red-500 text-sm sm:col-span-2">{error}</p>}

        <div className="sm:col-span-2 flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : editId ? 'Update Product' : 'Add Product'}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm(EMPTY_FORM) }} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* product card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {products.map(p => (
          <div
            key={p.id}
            className={`rounded-xl border overflow-hidden transition-all ${
              editId === p.id
                ? 'border-rose-deep ring-2 ring-rose-deep/40'
                : 'border-rose-dust/20 hover:border-rose-dust/50'
            }`}
          >
            {/* product image */}
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="w-full h-32 object-cover" />
            ) : (
              <div className="w-full h-32 bg-rose-dust/10 flex items-center justify-center text-xs text-rose-dust/40">
                No image
              </div>
            )}

            <div className="p-3">
              <p className="font-semibold text-sm truncate">{p.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">R {Number(p.price).toFixed(2)}</p>

              {/* out of stock indicator */}
              {p.stock === 0 && (
                <p className="text-xs text-red-400 mt-0.5">Out of stock</p>
              )}

              <div className="flex gap-2 mt-3">
                <button onClick={() => startEdit(p)} className="text-xs text-rose-mid hover:underline">Edit</button>
                <button onClick={() => handleDelete(p.id, p.name)} className="text-xs text-red-400 hover:underline">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
