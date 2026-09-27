// The Courier Guy booking, for the admin Orders page.
// Parcel sizes mirror supabase/functions/_shared/courier.ts — the server's copy
// is the one actually sent to Courier Guy; this one only labels the buttons.
import { supabase } from './supabase'

export const PARCELS = [
  { key: 'small',  label: 'Small',  detail: '15×10×10 cm · 0.8 kg' },
  { key: 'medium', label: 'Medium', detail: '25×20×15 cm · 2 kg' },
  { key: 'large',  label: 'Large',  detail: '40×30×20 cm · 5 kg' },
]
export const DEFAULT_PARCEL = 'small'

export const trackingUrl = (ref) =>
  `https://portal.thecourierguy.co.za/track?ref=${encodeURIComponent(ref)}`

// call the `courier` Edge Function; always resolves to { data } or { error: message }
export async function courier(action, body) {
  const { data, error } = await supabase.functions.invoke('courier', { body: { action, ...body } })
  if (!error) return { data }

  // a non-2xx reply carries our own message in its JSON body
  let payload = null
  try { payload = await error.context?.json() } catch { /* not JSON */ }
  return { error: payload?.error ?? 'Could not reach the courier service.', data: payload }
}
