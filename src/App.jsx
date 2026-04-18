import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Storefront from './pages/Storefront'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import AdminLogin from './pages/admin/AdminLogin'
import AdminProducts from './pages/admin/AdminProducts'
import AdminOrders from './pages/admin/AdminOrders'
import AdminGuard from './components/AdminGuard'

export default function App() {
  return (
    <div className="min-h-screen bg-cream dark:bg-navy text-navy dark:text-cream transition-colors duration-300">
      <Navbar />

      <Routes>
        {/* public storefront */}
        <Route path="/" element={<Storefront />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmation" element={<OrderConfirmation />} />

        {/* admin — login is public, rest is guarded */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/products" element={<AdminGuard><AdminProducts /></AdminGuard>} />
        <Route path="/admin/orders" element={<AdminGuard><AdminOrders /></AdminGuard>} />
      </Routes>
    </div>
  )
}
