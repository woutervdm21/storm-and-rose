import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Storefront from './pages/Storefront'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import AdminProducts from './pages/admin/AdminProducts'
import AdminOrders from './pages/admin/AdminOrders'
import AdminGuard from './components/AdminGuard'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-cream dark:bg-navy text-navy dark:text-cream transition-colors duration-300">
      <Navbar />

      <div className="flex-1">
        <Routes>
          {/* public storefront */}
          <Route path="/" element={<Storefront />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />

          {/* admin login — public */}
          <Route path="/admin" element={<AdminLogin />} />

          {/* admin panel — guarded, shared layout with nav */}
          <Route element={<AdminGuard><AdminLayout /></AdminGuard>}>
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
          </Route>

          {/* catch-all 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      <Footer />
      <Toaster position="bottom-right" richColors />
    </div>
  )
}
