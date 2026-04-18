import { createClient } from '@supabase/supabase-js'

// single shared Supabase client — import this everywhere, never re-instantiate
const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
