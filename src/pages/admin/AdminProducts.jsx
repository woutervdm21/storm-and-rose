// Admin product management — categories + product CRUD with image upload
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'

const EMPTY_FORM = { name: '', description: '', price: '', stock: '', category_id: '' }
const BUCKET = 'product-images'

export default function AdminProducts() {
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm]             = useState(EMPTY_FORM)
  const [editId, setEditId]         = useState(null)
  const [imageFiles, setImageFiles] = useState([])
  const [existingImages, setExistingImages] = useState([])
  const [fileKey, setFileKey]       = useState(0)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  // list filters — the catalogue is long enough that showing all of it is unusable
  const [search, setSearch]         = useState('')
  const [filterCat, setFilterCat]   = useState('all')   // 'all' | 'none' | category id
  const [filterStock, setFilterStock] = useState('all') // 'all' | 'in' | 'out'

  useEffect(() => {
    loadCategories()
    loadProducts()
  }, [])

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('*').order('sort_order').order('name')
    setCategories(data ?? [])
  }

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('*, categories(name), product_images(id, url, sort_order)')
      .order('created_at', { ascending: false })
    setProducts(data ?? [])
  }

  const visibleProducts = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.trim().toLowerCase())) return false
    if (filterCat === 'none' && p.category_id) return false
    if (filterCat !== 'all' && filterCat !== 'none' && p.category_id !== filterCat) return false
    if (filterStock === 'in'  && p.stock === 0) return false
    if (filterStock === 'out' && p.stock !== 0) return false
    return true
  })

  const isFiltered = search !== '' || filterCat !== 'all' || filterStock !== 'all'

  function clearFilters() {
    setSearch('')
    setFilterCat('all')
    setFilterStock('all')
  }

  const sortedImages = (product) =>
    [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)

  // Persist image order and keep products.image_url (the cover used by cards,
  // carts and social previews) in sync with the first photo.
  async function persistImageOrder(productId, list) {
    await Promise.all(
      list.map((img, i) => supabase.from('product_images').update({ sort_order: i }).eq('id', img.id))
    )
    await supabase.from('products').update({ image_url: list[0]?.url ?? null }).eq('id', productId)
  }

  async function deleteImage(img) {
    const { error: delError } = await supabase.from('product_images').delete().eq('id', img.id)
    if (delError) { toast.error('Could not delete photo.'); return }
    const list = existingImages.filter(i => i.id !== img.id)
    setExistingImages(list)
    await persistImageOrder(editId, list)
    toast.success('Photo removed')
    loadProducts()
  }

  async function moveImage(index, dir) {
    const target = index + dir
    if (target < 0 || target >= existingImages.length) return
    const list = [...existingImages]
    ;[list[index], list[target]] = [list[target], list[index]]
    setExistingImages(list)
    await persistImageOrder(editId, list)
    loadProducts()
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      name:        form.name,
      description: form.description,
      price:       parseFloat(form.price),
      stock:       parseInt(form.stock),
      category_id: form.category_id || null,
    }

    let productId = editId
    if (editId) {
      await supabase.from('products').update(payload).eq('id', editId)
    } else {
      const { data, error: insertError } = await supabase.from('products').insert(payload).select('id').single()
      if (insertError) { toast.error('Could not save product.'); setError('Could not save product.'); setLoading(false); return }
      productId = data.id
    }

    // upload any queued photos, appending after the ones already there
    if (imageFiles.length > 0) {
      const rows = []
      for (const [i, file] of imageFiles.entries()) {
        const fileName = `${Date.now()}-${i}-${file.name}`
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(fileName, file)
        if (uploadError) { toast.error(`Upload failed for ${file.name}.`); setError(`Upload failed for ${file.name}.`); setLoading(false); return }
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName)
        rows.push({ product_id: productId, url: urlData.publicUrl, sort_order: existingImages.length + i })
      }
      await supabase.from('product_images').insert(rows)
      // cover = first photo overall (existing first, else first new upload)
      const cover = existingImages[0]?.url ?? rows[0].url
      await supabase.from('products').update({ image_url: cover }).eq('id', productId)
    }

    toast.success(editId ? `${form.name} updated` : `${form.name} added`)
    setForm(EMPTY_FORM)
    setEditId(null)
    setImageFiles([])
    setExistingImages([])
    setFileKey(k => k + 1)
    setLoading(false)
    loadProducts()
  }

  function startEdit(product) {
    setEditId(product.id)
    setForm({
      name:        product.name,
      description: product.description,
      price:       product.price,
      stock:       product.stock,
      category_id: product.category_id ?? '',
    })
    setExistingImages(sortedImages(product))
    setImageFiles([])
    setFileKey(k => k + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(id, name) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    toast.success(`${name} deleted`)
    loadProducts()
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-12 space-y-12">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust">Products</h1>
        <a href="/admin/categories" className="text-sm text-rose-mid hover:underline">Manage categories →</a>
      </div>

      {/* product form */}
      <form
        onSubmit={handleSubmit}
        className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 rounded-xl border transition-colors ${
          editId ? 'border-rose-deep bg-rose-dust/10' : 'border-rose-dust/20 bg-transparent'
        }`}
      >
        {editId && (
          <p className="sm:col-span-2 text-sm font-semibold text-rose-deep dark:text-rose-dust">Editing product</p>
        )}

        <input name="name"        placeholder="Product name"  required value={form.name}        onChange={handleChange} className="input-field" />
        <input name="price"       placeholder="Price (R)"     required type="number" step="0.01" value={form.price} onChange={handleChange} className="input-field" />
        <input name="stock"       placeholder="Stock qty"     required type="number" value={form.stock}      onChange={handleChange} className="input-field" />

        {/* collection selector */}
        <select name="category_id" value={form.category_id} onChange={handleChange} className="input-field">
          <option value="">No collection</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <input name="description" placeholder="Description" value={form.description} onChange={handleChange} className="input-field sm:col-span-2" />

        <div className="sm:col-span-2 space-y-3">
          {/* current photos — first one is the cover; reorder or remove */}
          {editId && existingImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {existingImages.map((img, i) => (
                <div key={img.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-rose-dust/30 group">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  {i === 0 && (
                    <span className="absolute top-0 left-0 text-[0.55rem] bg-rose-deep text-cream px-1.5 py-0.5 rounded-br-lg">
                      Cover
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 py-0.5 bg-black/50
                                  opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0}
                            className="text-cream text-xs px-1 disabled:opacity-30" title="Move left">◀</button>
                    <button type="button" onClick={() => deleteImage(img)}
                            className="text-red-300 text-xs px-1" title="Remove">✕</button>
                    <button type="button" onClick={() => moveImage(i, 1)} disabled={i === existingImages.length - 1}
                            className="text-cream text-xs px-1 disabled:opacity-30" title="Move right">▶</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <input key={fileKey} type="file" accept="image/*" multiple
                 onChange={e => setImageFiles([...e.target.files])} className="text-sm w-full" />
          {imageFiles.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {imageFiles.length} new photo{imageFiles.length > 1 ? 's' : ''} queued — saved when you submit
            </p>
          )}
        </div>

        {error && <p className="text-red-500 text-sm sm:col-span-2">{error}</p>}

        <div className="sm:col-span-2 flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : editId ? 'Update Product' : 'Add Product'}
          </button>
          {editId && (
            <button
              type="button"
              onClick={() => { setEditId(null); setForm(EMPTY_FORM); setExistingImages([]); setImageFiles([]); setFileKey(k => k + 1) }}
              className="btn-secondary"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* list filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name"
          aria-label="Search products by name"
          className="input-field w-auto min-w-[14rem] flex-1 max-w-xs"
        />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          aria-label="Filter by collection"
          className="input-field w-auto"
        >
          <option value="all">All collections</option>
          <option value="none">Uncategorised</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={filterStock}
          onChange={(e) => setFilterStock(e.target.value)}
          aria-label="Filter by stock"
          className="input-field w-auto"
        >
          <option value="all">Any stock</option>
          <option value="in">In stock</option>
          <option value="out">Out of stock</option>
        </select>

        <span className="text-xs text-gray-500 dark:text-gray-400">
          {visibleProducts.length} of {products.length}
        </span>
        {isFiltered && (
          <button onClick={clearFilters} className="text-xs text-rose-mid hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {/* product card grid */}
      {visibleProducts.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-12 text-center">
          No products match these filters.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {visibleProducts.map(p => (
          <div
            key={p.id}
            className={`rounded-xl border overflow-hidden transition-all ${
              editId === p.id
                ? 'border-rose-deep ring-2 ring-rose-deep/40'
                : 'border-rose-dust/20 hover:border-rose-dust/50'
            }`}
          >
            <div className="relative">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-rose-dust/10 flex items-center justify-center text-xs text-rose-dust/40">No image</div>
              )}
              {(p.product_images?.length ?? 0) > 1 && (
                <span className="absolute bottom-1 right-1 text-[0.6rem] bg-black/55 text-cream px-1.5 py-0.5 rounded-full">
                  {p.product_images.length} photos
                </span>
              )}
            </div>

            <div className="p-3">
              <p className="font-semibold text-sm truncate">{p.name}</p>

              {/* category badge */}
              {p.categories?.name && (
                <span className="inline-block text-xs bg-rose-dust/15 text-rose-deep dark:text-rose-dust px-2 py-0.5 rounded-full mt-1">
                  {p.categories.name}
                </span>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">R {Number(p.price).toFixed(2)}</p>
              {p.stock === 0 && <p className="text-xs text-red-400 mt-0.5">Out of stock</p>}

              <div className="flex gap-2 mt-3">
                <button onClick={() => startEdit(p)}           className="text-xs text-rose-mid hover:underline">Edit</button>
                <button onClick={() => handleDelete(p.id, p.name)} className="text-xs text-red-400 hover:underline">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
