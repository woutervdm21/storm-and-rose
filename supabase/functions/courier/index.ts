// Books The Courier Guy for a door-to-door order, from the admin Orders page.
//
//   { action: 'quote', order_id, parcel }                    — free price check
//   { action: 'book',  order_id, parcel, confirmed_rate }    — books and bills a real collection
//   { action: 'label', order_id }                            — waybill PDF link
//   { action: 'release', order_id }                          — unstick a booking that never completed
//
// Runs server-side so the Courier Guy key never reaches a browser. Only a
// signed-in admin may call it: the anon key is also a valid JWT, so the
// platform's JWT check alone would let any visitor through.
//
// A booking costs money and cannot be undone from here, so `book`:
//   - re-quotes, and refuses if the price moved from what the admin confirmed
//   - claims the order in one conditional update, so a double click or two
//     open tabs cannot book it twice
//   - refuses an order that is already booked
//
// Env vars (set with `supabase secrets set`):
//   COURIER_GUY_API_KEY   — Courier Guy portal → Integrations → API Keys
//   COURIER_CONTACT_NAME  — who the driver asks for at collection
//   COURIER_CONTACT_PHONE — their cellphone
//   COURIER_CONTACT_EMAIL — for Courier Guy's collection notices

import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  rateRequest, shipmentRequest, pickEconomy, trackingUrl,
  getRates, createShipment, getLabel, DEFAULT_PARCEL,
} from '../_shared/courier.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

// a price counts as unchanged within a cent
const samePrice = (a: number, b: number) => Math.abs(Number(a) - Number(b)) < 0.01

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // guard: signed-in admin only
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return json({ error: 'Sign in as an admin first.' }, 401)

  const key = Deno.env.get('COURIER_GUY_API_KEY')
  if (!key) return json({ error: 'COURIER_GUY_API_KEY is not set.' }, 500)

  const { action, order_id, parcel = DEFAULT_PARCEL, confirmed_rate } =
    await req.json().catch(() => ({} as Record<string, any>))
  if (!order_id) return json({ error: 'order_id required' }, 400)

  // load the order, with prices from products rather than what checkout sent
  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(quantity, products(price))')
    .eq('id', order_id)
    .single()
  if (!order) return json({ error: 'Order not found.' }, 404)

  // --- label: waybill for an order that is already booked ---
  if (action === 'label') {
    if (!order.courier_shipment_id) return json({ error: 'This order has not been booked yet.' }, 400)
    const res = await getLabel(key, order.courier_shipment_id)
    if (!res.ok || !res.body?.url) {
      console.error('Label failed', order.id, res.status, res.body)
      return json({ error: 'Courier Guy did not return a label. Try again in a minute.' }, 502)
    }
    return json({ url: res.body.url })
  }

  // --- release: clear a booking that never completed, once the admin has
  // checked the portal and confirmed nothing was booked ---
  if (action === 'release') {
    if (order.courier_shipment_id) return json({ error: 'This order is booked — nothing to release.' }, 400)
    await supabase.from('orders').update({ courier_booked_at: null }).eq('id', order.id)
    return json({ released: true })
  }

  if (action !== 'quote' && action !== 'book') return json({ error: 'Unknown action.' }, 400)

  // only door-to-door goes through here — lockers need a chosen locker first
  if (order.fulfillment !== 'delivery_door') {
    return json({ error: 'Only door-to-door orders can be booked here.' }, 400)
  }
  if (order.courier_shipment_id) {
    return json({ error: 'This order is already booked.', tracking_ref: order.courier_tracking_ref }, 409)
  }

  // declared value = what the goods are worth, from our own prices
  const declaredValue = (order.order_items ?? []).reduce(
    (sum: number, i: { quantity: number; products: { price: number } | null }) =>
      sum + i.quantity * Number(i.products?.price ?? 0), 0)

  // --- quote (also the first step of booking) ---
  const rateBody = rateRequest(order, parcel, declaredValue)
  if (!rateBody.ok) return json({ error: `Can't quote: ${rateBody.reason}.` }, 400)

  const quote = await getRates(key, rateBody.body)
  const economy = quote.ok ? pickEconomy(quote.body?.rates) : null
  if (!economy) {
    console.error('Quote failed', order.id, quote.status, quote.body)
    return json({ error: 'Courier Guy did not return an Economy price for this address. Check the address, or book it in the portal.' }, 502)
  }

  const offer = {
    rate:             economy.rate,
    service_name:     economy.service_level.name,
    service_level_id: economy.service_level.id,
    collection_date:  economy.service_level.collection_date,
    delivery_from:    economy.service_level.delivery_date_from,
    delivery_to:      economy.service_level.delivery_date_to,
    charged_kg:       economy.charged_weight,
  }

  if (action === 'quote') return json(offer)

  // --- book ---
  if (confirmed_rate === undefined || !samePrice(confirmed_rate, offer.rate)) {
    return json({ error: 'The price changed since you checked it. Review the new price and confirm again.', ...offer }, 409)
  }

  const shop = {
    name:          Deno.env.get('COURIER_CONTACT_NAME') ?? '',
    mobile_number: Deno.env.get('COURIER_CONTACT_PHONE') ?? '',
    email:         Deno.env.get('COURIER_CONTACT_EMAIL') ?? '',
  }
  if (!shop.name || !shop.mobile_number) {
    return json({ error: 'COURIER_CONTACT_NAME and COURIER_CONTACT_PHONE must be set before booking.' }, 500)
  }

  const shipment = shipmentRequest(order, parcel, declaredValue, offer.service_level_id, shop)
  if (!shipment.ok) return json({ error: `Can't book: ${shipment.reason}.` }, 400)

  // claim the order — only one request can move courier_booked_at off null
  const { data: claimed } = await supabase
    .from('orders')
    .update({ courier_booked_at: new Date().toISOString() })
    .eq('id', order.id)
    .is('courier_booked_at', null)
    .select('id')
  if (!claimed?.length) return json({ error: 'This order is already being booked.' }, 409)

  // a dropped connection leaves it unknown whether Courier Guy booked it, so
  // the claim stays in place — the admin checks the portal, then releases it
  let created
  try {
    created = await createShipment(key, shipment.body)
  } catch (err) {
    console.error('Booking outcome unknown', order.id, err)
    return json({ error: 'Lost contact with Courier Guy mid-booking. Check the portal for this order before trying again.', unconfirmed: true }, 502)
  }

  if (!created.ok || !created.body?.id) {
    // release the claim so it can be tried again
    await supabase.from('orders').update({ courier_booked_at: null }).eq('id', order.id)
    console.error('Booking failed', order.id, created.status, created.body)
    const detail = typeof created.body === 'string' ? created.body : created.body?.message ?? ''
    return json({ error: `Courier Guy refused the booking. ${detail}`.trim() }, 502)
  }

  const tracking_ref = created.body.short_tracking_reference ?? created.body.tracking_reference ?? null

  // booked and billed — record it; if this write fails the booking still stands
  const { error: saveError } = await supabase.from('orders').update({
    courier_shipment_id:  created.body.id,
    courier_tracking_ref: tracking_ref,
    courier_cost:         offer.rate,
  }).eq('id', order.id)
  if (saveError) console.error('Booked but not saved', order.id, created.body.id, tracking_ref, saveError)

  return json({
    shipment_id:  created.body.id,
    tracking_ref,
    tracking_url: tracking_ref ? trackingUrl(tracking_ref) : null,
    rate:         offer.rate,
    collection_date: offer.collection_date,
  })
})
