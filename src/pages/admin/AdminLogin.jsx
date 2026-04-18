// Admin login page — authenticates via Supabase email/password
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email:    form.email,
      password: form.password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    navigate('/admin/products')
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-20">
      <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust mb-8 text-center">Admin Login</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={handleChange}
          className="w-full border border-rose-dust/50 rounded-lg px-4 py-2 bg-cream dark:bg-navy focus:outline-none focus:border-rose-deep"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          value={form.password}
          onChange={handleChange}
          className="w-full border border-rose-dust/50 rounded-lg px-4 py-2 bg-cream dark:bg-navy focus:outline-none focus:border-rose-deep"
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-rose-deep hover:bg-rose-mid disabled:opacity-50 text-cream font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </main>
  )
}
