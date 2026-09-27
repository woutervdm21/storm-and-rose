// Books The Courier Guy for a door-to-door or Pudo locker order, from the admin Orders page.
//
//   { action: 'quote', order_id, parcel, from }                  — free price check
//   { action: 'book',  order_id, parcel, from, confirmed_rate }  — books and bills a real collection
//
// `from` is the collection point (emalahleni | middelburg).
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
//   COURIER_CONTACT_EMALAHLENI_NAME / _PHONE — who the driver asks for there
//   COURIER_CONTACT_MIDDELBURG_NAME / _PHONE — likewise for Middelburg
//   COURIER_CONTACT_EMAIL — for Courier Guy's collection notices (shared)
//   RESEND_API_KEY, ORDER_EMAIL_FROM, ORDER_EMAIL_TO — for the customer's tracking email

import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  rateRequest, shipmentRequest, pickRate, isLockerOrder, trackingUrl,
  getRates, createShipment, getLabel, DEFAULT_PARCEL, DEFAULT_COLLECTION,
} from '../_shared/courier.ts'
import { customerShippedEmail, sendEmail } from '../_shared/order-email.ts'

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

  const { action, order_id, parcel = DEFAULT_PARCEL, from = DEFAULT_COLLECTION, confirmed_rate } =
    await req.json().catch(() => ({} as Record<string, any>))
  if (!order_id) return json({ error: 'order_id required' }, 400)

  // load the order, with prices from products rather than what checkout sent
  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(quantity, unit_price, variant, products(name, price))')
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

  // door-to-door, or a locker order that has its locker chosen
  if (order.fulfillment !== 'delivery_door' && !(isLockerOrder(order) && order.pudo_locker_id)) {
    return json({ error: 'Only door-to-door orders, and locker orders with a chosen locker, can be booked here.' }, 400)
  }
  if (order.courier_shipment_id) {
    return json({ error: 'This order is already booked.', tracking_ref: order.courier_tracking_ref }, 409)
  }

  // declared value = what the goods are worth, from our own prices
  const declaredValue = (order.order_items ?? []).reduce(
    (sum: number, i: { quantity: number; products: { price: number } | null }) =>
      sum + i.quantity * Number(i.products?.price ?? 0), 0)

  // --- quote (also the first step of booking) ---
  const rateBody = rateRequest(order, parcel, declaredValue, from)
  if (!rateBody.ok) return json({ error: `Can't quote: ${rateBody.reason}.` }, 400)

  const quote = await getRates(key, rateBody.body)
  const economy = quote.ok ? pickRate(order, quote.body?.rates) : null
  if (!economy) {
    console.error('Quote failed', order.id, quote.status, quote.body)
    return json({
      error: isLockerOrder(order)
        ? 'Courier Guy did not return a locker price. The box may be too big for a locker, or the locker may be offline — try a smaller box, or book it in the portal.'
        : 'Courier Guy did not return an Economy price for this address. Check the address, or book it in the portal.',
    }, 502)
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

  // the person at the chosen collection point
  const prefix = `COURIER_CONTACT_${String(from).toUpperCase()}`
  const shop = {
    name:          Deno.env.get(`${prefix}_NAME`) ?? '',
    mobile_number: Deno.env.get(`${prefix}_PHONE`) ?? '',
    email:         Deno.env.get('COURIER_CONTACT_EMAIL') ?? '',
  }
  if (!shop.name || !shop.mobile_number) {
    return json({ error: `${prefix}_NAME and ${prefix}_PHONE must be set before booking from here.` }, 500)
  }

  const shipment = shipmentRequest(order, parcel, declaredValue, from, offer.service_level_id, shop)
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

  // tell the customer it's on its way — best effort, the booking already stands
  let email_sent = false
  if (tracking_ref && order.customer_email) {
    const mail = customerShippedEmail(order, order.order_items ?? [], {
      trackingRef:    tracking_ref,
      trackingUrl:    trackingUrl(tracking_ref),
      collectionDate: offer.collection_date,
    })
    const sent = await sendEmail({
      to:             order.customer_email,
      subject:        mail.subject,
      html:           mail.html,
      replyTo:        Deno.env.get('ORDER_EMAIL_TO'),
      idempotencyKey: `order-shipped-${order.id}`,
    }).catch((err) => ({ ok: false, status: 0, body: String(err) }))
    email_sent = sent.ok
    if (!sent.ok) console.error('Tracking email failed', order.id, sent.status, sent.body)
  }

  return json({
    shipment_id:  created.body.id,
    tracking_ref,
    tracking_url: tracking_ref ? trackingUrl(tracking_ref) : null,
    rate:         offer.rate,
    collection_date: offer.collection_date,
    email_sent,
  })
})
