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
  deliveryAddressFor, rateRequest, shipmentRequest, pickEconomy, getRates,
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
}
