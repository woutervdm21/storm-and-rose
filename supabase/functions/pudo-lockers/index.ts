// Finds Pudo lockers for the checkout's locker picker.
//
//   { q: 'Middelburg' }            — lockers matching a town, suburb or street
//   { lat: -25.87, lng: 29.23 }    — lockers closest to the customer
//
// Customers call this before they have an order, so it takes anyone the
// platform lets through (the site's anon key). It only ever reads, and it runs
// here rather than in the browser so the Courier Guy key stays secret.
//
// Env vars: COURIER_GUY_API_KEY (shared with the `courier` function)

import { findLockers, tidyLockers } from '../_shared/courier.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

// roughly South Africa — anything outside is a typo or a probe, not a customer
const inSouthAfrica = (lat: number, lng: number) =>
  lat > -35.5 && lat < -21.5 && lng > 16 && lng < 33.5

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const key = Deno.env.get('COURIER_GUY_API_KEY')
  if (!key) return json({ error: 'Locker search is unavailable right now.' }, 500)

  const input = await req.json().catch(() => ({} as Record<string, unknown>))

  // validate: a short text search, or a point inside the country
  const q   = typeof input.q === 'string' ? input.q.trim().slice(0, 60) : ''
  const lat = Number(input.lat)
  const lng = Number(input.lng)
  const byPoint = Number.isFinite(lat) && Number.isFinite(lng) && inSouthAfrica(lat, lng)

  if (!byPoint && q.length < 2) return json({ error: 'Type at least 2 letters of your town or suburb.' }, 400)

  const res = await findLockers(key, byPoint ? { lat, lng } : { q })
  if (!res.ok) {
    console.error('Locker search failed', res.status, res.body)
    return json({ error: 'Locker search is unavailable right now.' }, 502)
  }

  return json({ lockers: tidyLockers(res.body?.pickup_points) })
})
