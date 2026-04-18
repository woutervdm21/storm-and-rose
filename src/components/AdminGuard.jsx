// Wraps admin routes — redirects to /admin login if no active Supabase session
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminGuard({ children }) {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) navigate('/admin')
      setChecking(false)
    }
    checkSession()
  }, [navigate])

  if (checking) return <p className="p-8 text-center">Checking access...</p>

  return children
}
