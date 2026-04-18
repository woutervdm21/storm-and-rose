// Shared layout for all admin pages — nav between Products and Orders, plus sign out
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AdminLayout() {
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/admin')
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-navy text-navy dark:text-cream">
      {/* admin top bar */}
      <nav className="border-b border-rose-dust/30 bg-cream dark:bg-navy">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-serif text-rose-deep dark:text-rose-dust text-sm tracking-wide">Admin</span>
            <AdminNavLink to="/admin/products">Products</AdminNavLink>
            <AdminNavLink to="/admin/orders">Orders</AdminNavLink>
          </div>

          <div className="flex items-center gap-4">
            <NavLink to="/" className="text-xs text-gray-400 hover:text-rose-mid transition-colors">
              ← Storefront
            </NavLink>
            <button
              onClick={handleSignOut}
              className="text-xs text-rose-mid hover:text-rose-deep dark:hover:text-rose-dust transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* page content */}
      <Outlet />
    </div>
  )
}

function AdminNavLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `text-sm font-medium transition-colors ${
          isActive
            ? 'text-rose-deep dark:text-rose-dust border-b-2 border-rose-deep dark:border-rose-dust pb-0.5'
            : 'text-navy dark:text-cream hover:text-rose-mid'
        }`
      }
    >
      {children}
    </NavLink>
  )
}
