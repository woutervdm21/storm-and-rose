// Checks the Courier Guy request builders — the parts that must be right
// before a booking is sent, because a booking is billed.
//
//   node scripts/test-courier.mjs            offline checks only
//   node scripts/test-courier.mjs --quote    also asks Courier Guy for a real,
//                                            free quote using the same builder
//
// This never books anything: createShipment is deliberately not imported.
// --quote needs COURIER_GUY_API_KEY in the environment, or CourierGuyAPIKey.txt
// in the project root (git-ignored).

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  deliveryAddressFor, rateRequest, shipmentRequest, pickEconomy, pickLocker, pickRate, getRates,
  tidyLockers, findLockers, LOCKER_PROVIDER, readTracking,
  COLLECTION_POINTS, DEFAULT_COLLECTION, PARCELS, DEFAULT_PARCEL,
} from '../supabase/functions/_shared/courier.ts'

// a made-up order to a public address — never a real customer
const ORDER = {
  id: '2f1c9d8e-4b6a-47c1-9f3e-0a5b7c2d1e8f',
  customer_name:     'Test Customer',
  customer_email:    'test@example.com',
  customer_phone:    '0820000000',
  shipping_line1:    'Sandton City',
  shipping_line2:    'Sandton',
  shipping_city:     'Johannesburg',
  shipping_province: 'Gauteng',
  shipping_postal:   '2196',
}
const SHOP = { name: 'Storm & Rose', mobile_number: '0820000001', email: 'shop@example.com' }

// --- delivery address ---
{
  const ok = deliveryAddressFor(ORDER)
  assert.equal(ok.ok, true)
  assert.deepEqual(ok.address, {
    type: 'residential', street_address: 'Sandton City', local_area: 'Sandton',
    city: 'Johannesburg', zone: 'Gauteng', country: 'ZA', code: '2196',
  })

  const missing = deliveryAddressFor({ ...ORDER, shipping_city: ' ', shipping_postal: null })
  assert.equal(missing.ok, false)
  assert.match(missing.reason, /city, postal code/)

  // suburb is optional at checkout
  assert.equal(deliveryAddressFor({ ...ORDER, shipping_line2: null }).address.local_area, '')
}

// --- quote body ---
{
  const r = rateRequest(ORDER, DEFAULT_PARCEL, 240, DEFAULT_COLLECTION)
  assert.equal(r.ok, true)
  assert.equal(DEFAULT_PARCEL, 'small')
  assert.equal(DEFAULT_COLLECTION, 'emalahleni')
  assert.equal(r.body.collection_address.city, 'Emalahleni')
  assert.equal(rateRequest(ORDER, 'small', 240, 'middelburg').body.collection_address.city, 'Middelburg')
  assert.equal(rateRequest(ORDER, 'small', 240, 'durban').ok, false)
  assert.equal(r.body.declared_value, 240)
  assert.deepEqual(r.body.parcels, [{
    submitted_length_cm: PARCELS.small.length, submitted_width_cm: PARCELS.small.width,
    submitted_height_cm: PARCELS.small.height, submitted_weight_kg: PARCELS.small.kg,
  }])

  assert.equal(rateRequest(ORDER, 'enormous', 240, DEFAULT_COLLECTION).ok, false)
}

// --- booking body ---
{
  const s = shipmentRequest(ORDER, 'medium', 240, 'middelburg', 264597, SHOP)
  assert.equal(s.body.collection_address, COLLECTION_POINTS.middelburg.address)
  assert.equal(s.ok, true)
  assert.equal(s.body.service_level_id, 264597)
  assert.equal(s.body.customer_reference, '#2F1C9D8E')
  assert.deepEqual(s.body.collection_contact, SHOP)
  assert.deepEqual(s.body.delivery_contact, { name: 'Test Customer', mobile_number: '0820000000', email: 'test@example.com' })
  assert.equal(s.body.parcels[0].submitted_weight_kg, PARCELS.medium.kg)
  assert.equal(s.body.parcels[0].submitted_description, 'Order #2F1C9D8E')

  // the driver needs a number to call
  const noPhone = shipmentRequest({ ...ORDER, customer_phone: '' }, 'small', 240, DEFAULT_COLLECTION, 1, SHOP)
  assert.equal(noPhone.ok, false)
  assert.match(noPhone.reason, /phone/)
}

// --- choosing the rate ---
{
  const rates = [
    { rate: 203.55, service_level: { code: 'PRI' } },
    { rate: 127.22, service_level: { code: 'ECO' } },
    { rate: 90,     service_level: { code: 'SOMETHING_ELSE' } },
  ]
  assert.equal(pickEconomy(rates).rate, 127.22)
  assert.equal(pickEconomy([{ rate: 139.45, service_level: { code: 'ECOR' } }]).rate, 139.45)
  assert.equal(pickEconomy([{ rate: 203.55, service_level: { code: 'PRI' } }]), null)
  assert.equal(pickEconomy(undefined), null)
}

// --- Pudo locker orders ---
const LOCKER_ORDER = {
  ...ORDER,
  fulfillment: 'delivery_locker',
  shipping_line1: null, shipping_line2: null, shipping_city: null, shipping_province: null, shipping_postal: null,
  pudo_locker_id: 'CG1375',
}
{
  // quote goes to the locker, not an address, and carries no declared value
  const r = rateRequest(LOCKER_ORDER, 'small', 240, DEFAULT_COLLECTION)
  assert.equal(r.ok, true)
  assert.equal(r.body.delivery_pickup_point_id, 'CG1375')
  assert.equal(r.body.delivery_pickup_point_provider, LOCKER_PROVIDER)
  assert.equal('delivery_address' in r.body, false)
  assert.equal('declared_value' in r.body, false)

  // the booking keeps the locker
  const s = shipmentRequest(LOCKER_ORDER, 'small', 240, DEFAULT_COLLECTION, 264523, SHOP)
  assert.equal(s.ok, true)
  assert.equal(s.body.delivery_pickup_point_id, 'CG1375')
  assert.equal('delivery_address' in s.body, false)

  // a locker order with no locker can't be quoted
  const none = rateRequest({ ...LOCKER_ORDER, pudo_locker_id: null }, 'small', 240, DEFAULT_COLLECTION)
  assert.equal(none.ok, false)
  assert.match(none.reason, /locker/)

  // door orders are untouched
  assert.equal('delivery_address' in rateRequest(ORDER, 'small', 240, DEFAULT_COLLECTION).body, true)
}

// --- choosing a locker rate ---
{
  const rates = [
    { rate: 190.52, service_level: { code: 'D2LL - ECO' } },
    { rate: 128.82, service_level: { code: 'D2LM - ECO' } },
    { rate: 127.22, service_level: { code: 'ECO' } },
  ]
  assert.equal(pickLocker(rates).rate, 128.82)
  assert.equal(pickRate(LOCKER_ORDER, rates).rate, 128.82)
  assert.equal(pickRate(ORDER, rates).rate, 127.22)
  assert.equal(pickLocker([{ rate: 127.22, service_level: { code: 'ECO' } }]), null)
}

// --- tidying locker search results ---
{
  const point = (over) => ({
    pickup_point_id: 'CG1', pickup_point_provider: 'tcg-locker', name: 'Engen', status: 'online', is_hidden: false,
    trading_hours: 'Mon â€“ Sun: All day',
    address: { street_address: '90 Keiskamma Drive', local_area: 'Aerorand', city: 'Middelburg', code: '1055', lat: -25.7, lng: 29.4 },
    ...over,
  })
  const tidy = tidyLockers([
    point(),
    point({ pickup_point_id: 'OFF', status: 'offline' }),
    point({ pickup_point_id: 'HID', is_hidden: true }),
    point({ pickup_point_id: 'OTHER', pickup_point_provider: 'someone-else' }),
  ])
  assert.deepEqual(tidy.map(l => l.id), ['CG1'])
  assert.equal(tidy[0].address, '90 Keiskamma Drive, Aerorand, Middelburg, 1055')
  assert.equal(tidy[0].hours, 'Mon – Sun: All day')
  assert.equal(tidyLockers(Array.from({ length: 30 }, () => point())).length, 10)

  // the town and code repeated inside street_address appear once
  const repeated = tidyLockers([point({ address: {
    street_address: '19A Samora Machel St, Middelburg, 1055, Middelburg, Middelburg, 1055',
    local_area: 'Middelburg', city: 'Middelburg', code: '1055',
  } })])
  assert.equal(repeated[0].address, '19A Samora Machel St, Middelburg, 1055')
  assert.deepEqual(tidyLockers(undefined), [])
}

// --- reading tracking ---
{
  const body = { shipments: [
    // someone else's parcel that happens to share the reference
    { shipment_id: 111, status: 'delivered', shipment_delivered_date: '2026-09-01T10:00:00Z' },
    { shipment_id: 222, status: 'in-transit', shipment_delivered_date: null },
  ] }
  assert.deepEqual(readTracking(body, 222), { status: 'in-transit', delivered: false, deliveredAt: null })
  // never picks up another account's parcel
  assert.equal(readTracking(body, 333), null)
  assert.equal(readTracking({ shipments: [] }, 222), null)
  assert.equal(readTracking(undefined, 222), null)

  // delivered by status, or by a delivered date alone
  assert.equal(readTracking({ shipments: [{ shipment_id: 5, status: 'delivered' }] }, 5).delivered, true)
  const byDate = readTracking({ shipments: [{ shipment_id: '5', status: 'pod-captured', shipment_delivered_date: '2026-10-01T12:00:00Z' }] }, 5)
  assert.equal(byDate.delivered, true)
  assert.equal(byDate.deliveredAt, '2026-10-01T12:00:00Z')
}

console.log('courier builders: all checks passed')

// --- optional: real, free quote with the same body the function sends ---
if (process.argv.includes('--quote')) {
  let key = process.env.COURIER_GUY_API_KEY
  if (!key) {
    try { key = readFileSync(new URL('../CourierGuyAPIKey.txt', import.meta.url), 'utf8').trim() } catch { /* none */ }
  }
  assert.ok(key, 'set COURIER_GUY_API_KEY or add CourierGuyAPIKey.txt')

  for (const from of Object.keys(COLLECTION_POINTS)) {
    for (const size of Object.keys(PARCELS)) {
      const body = rateRequest(ORDER, size, 240, from).body
      const res  = await getRates(key, body)
      assert.equal(res.ok, true, `quote failed (${res.status}): ${JSON.stringify(res.body).slice(0, 300)}`)
      const eco = pickEconomy(res.body.rates)
      assert.ok(eco, 'no Economy rate returned')
      assert.equal(typeof eco.service_level.id, 'number')
      console.log(`  from ${from.padEnd(10)} ${size.padEnd(6)} ${eco.service_level.name} R ${eco.rate}`)
    }
  }
  console.log('live quote: accepted by Courier Guy')

  // real locker search, then a quote to the first locker it finds
  const found = await findLockers(key, { q: 'Middelburg' })
  assert.equal(found.ok, true, `locker search failed (${found.status})`)
  const lockers = tidyLockers(found.body.pickup_points)
  assert.ok(lockers.length > 0, 'no online lockers found in Middelburg')
  console.log(`  ${lockers.length} online lockers in Middelburg, e.g. ${lockers[0].name} — ${lockers[0].address}`)

  const lockerQuote = await getRates(key, rateRequest({ ...LOCKER_ORDER, pudo_locker_id: lockers[0].id }, 'small', 240, DEFAULT_COLLECTION).body)
  assert.equal(lockerQuote.ok, true, `locker quote failed (${lockerQuote.status})`)
  const best = pickLocker(lockerQuote.body.rates)
  assert.ok(best, 'no locker rate returned')
  console.log(`  to that locker, Small box: ${best.service_level.name} R ${best.rate}`)
  console.log('live locker search + quote: accepted by Courier Guy')
}
