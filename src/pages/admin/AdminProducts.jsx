// Admin product management — list, create, edit, delete products and upload images
import { useEffect, useState } from 'react'
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
      if (uploadError) { setError('Image upload failed.'); setLoading(false); return }
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName)
      image_url = urlData.publicUrl
    }

    const payload = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock), image_url }

    if (editId) {
      // update existing product
      await supabase.from('products').update(payload).eq('id', editId)
    } else {
      // insert new product
      await supabase.from('products').insert(payload)
    }

    setForm(EMPTY_FORM)
    setEditId(null)
    setImageFile(null)
    setLoading(false)
    loadProducts()
  }

  function startEdit(product) {
    setEditId(product.id)
    setForm({ name: product.name, description: product.description, price: product.price, stock: product.stock })
  }

  async function handleDelete(id) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    loadProducts()
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust mb-8">Products</h1>

      {/* create / edit form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
        <input name="name"        placeholder="Product name"    required value={form.name}        onChange={handleChange} className="input-field" />
        <input name="price"       placeholder="Price (R)"       required type="number" step="0.01" value={form.price}  onChange={handleChange} className="input-field" />
        <input name="stock"       placeholder="Stock qty"       required type="number" value={form.stock}       onChange={handleChange} className="input-field" />
        <input name="description" placeholder="Description"     value={form.description} onChange={handleChange} className="input-field sm:col-span-2" />
        <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="sm:col-span-2 text-sm" />

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

      {/* product list */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-rose-dust/30">
            <th className="pb-2">Name</th><th className="pb-2">Price</th><th className="pb-2">Stock</th><th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id} className="border-b border-rose-dust/10 hover:bg-rose-dust/5">
              <td className="py-2">{p.name}</td>
              <td className="py-2">R {Number(p.price).toFixed(2)}</td>
              <td className="py-2">{p.stock}</td>
              <td className="py-2 flex gap-3 justify-end">
                <button onClick={() => startEdit(p)}    className="text-rose-mid hover:underline">Edit</button>
                <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
