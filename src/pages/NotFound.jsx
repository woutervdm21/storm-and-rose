// 404 page — shown for any unmatched route
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="max-w-lg mx-auto px-4 py-24 text-center">
      <img src="/images/Logo1.png" alt="" className="h-20 w-20 object-contain mx-auto mb-6 opacity-30" />
      <h1 className="font-serif text-5xl text-rose-deep dark:text-rose-dust mb-2">404</h1>
      <p className="font-serif text-xl mb-2">Page not found</p>
      <p className="text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary px-8 py-2.5">Back to Shop</Link>
    </main>
  )
}
