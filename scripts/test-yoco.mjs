// Exercises the two pieces of the Yoco flow that must not be wrong: the
// webhook signature check, and the amount we ask Yoco to charge.
//
// Nothing here talks to Yoco or Supabase, so it runs before the gateway exists
// and after every change to either.
//
//   node scripts/test-yoco.mjs

import assert from 'node:assert/strict'
import { sign, verifyWebhookSignature, TOLERANCE_SECONDS } from '../supabase/functions/_shared/yoco-signature.ts'
import { orderTotalCents } from '../supabase/functions/_shared/order-total.ts'

// a real secret is 24 random bytes, base64, behind a whsec_ prefix
const SECRET = 'whsec_' + Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64')
const OTHER  = 'whsec_' + Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64')

const NOW  = 1_757_700_000
const ID   = 'evt_01J9Z0QJ7X8K2M4N6P8R0T2V4X'
const BODY = JSON.stringify({
  id: ID,
  type: 'payment.succeeded',
  createdDate: '2026-09-13T09:00:00.000Z',
  payload: {
    id: 'p_01J9Z0QJ7X8K2M4N6P8R0T2V4X',
    type: 'payment',
    status: 'succeeded',
    amount: 58000,
    currency: 'ZAR',
    mode: 'test',
    metadata: { order_id: '2f1c9d8e-4b6a-47c1-9f3e-0a5b7c2d1e8f', reference: '2F1C9D8E' },
  },
})

// what Yoco puts in the webhook-signature header
async function headerFor(body = BODY, id = ID, timestamp = NOW, secret = SECRET) {
  return `v1,${await sign(`${id}.${timestamp}.${body}`, secret)}`
}

const results = []
async function check(name, fn) {
  try {
    await fn()
    results.push(['pass', name])
  } catch (err) {
    results.push(['FAIL', name, err.message])
  }
}

// --- webhook signatures ---------------------------------------------------

const verify = (over = {}) => verifyWebhookSignature({
  id: ID, timestamp: String(NOW), body: BODY, secret: SECRET, now: NOW, ...over,
})

await check('accepts a correctly signed event', async () => {
  const r = await verify({ signatureHeader: await headerFor() })
  assert.equal(r.ok, true, r.reason)
})

await check('accepts it when one of several rotated signatures matches', async () => {
  const wrong = await headerFor(BODY, ID, NOW, OTHER)
  const right = await headerFor()
  const r = await verify({ signatureHeader: `${wrong} ${right}` })
  assert.equal(r.ok, true, r.reason)
})

await check('rejects a body altered after signing', async () => {
  const header = await headerFor()
  // the amount bumped down, which is what an attacker would actually try
  const tampered = BODY.replace('"amount":58000', '"amount":100')
  const r = await verify({ signatureHeader: header, body: tampered })
  assert.equal(r.ok, false)
})

await check('rejects a signature made with a different secret', async () => {
  const r = await verify({ signatureHeader: await headerFor(BODY, ID, NOW, OTHER) })
  assert.equal(r.ok, false)
})

await check('rejects a signature lifted from another event id', async () => {
  const r = await verify({ signatureHeader: await headerFor(BODY, 'evt_somethingelse') })
  assert.equal(r.ok, false)
})

await check('rejects a replay from outside the tolerance window', async () => {
  const old = NOW - TOLERANCE_SECONDS - 1
  const r = await verify({ timestamp: String(old), signatureHeader: await headerFor(BODY, ID, old) })
  assert.equal(r.ok, false)
  assert.match(r.reason, /tolerance/)
})

await check('accepts one just inside the tolerance window', async () => {
  const recent = NOW - TOLERANCE_SECONDS + 1
  const r = await verify({ timestamp: String(recent), signatureHeader: await headerFor(BODY, ID, recent) })
  assert.equal(r.ok, true, r.reason)
})

await check('rejects a missing signature header', async () => {
  assert.equal((await verify({ signatureHeader: null })).ok, false)
})

await check('rejects a non-numeric timestamp', async () => {
  const r = await verify({ timestamp: 'not-a-time', signatureHeader: await headerFor() })
  assert.equal(r.ok, false)
})

await check('refuses everything when no secret is configured', async () => {
  const r = await verify({ secret: undefined, signatureHeader: await headerFor() })
  assert.equal(r.ok, false)
  assert.match(r.reason, /secret/)
})

// --- what we charge -------------------------------------------------------

const line = (price, quantity = 1) => ({ quantity, products: { price } })
const cents = (lines, fulfillment) => orderTotalCents(lines, fulfillment)

await check('charges items plus the door-to-door courier fee', async () => {
  const r = cents([line(450), line(120, 2)], 'delivery_door')
  assert.deepEqual(r, { ok: true, cents: 82000 })   // 450 + 240 + 130
})

await check('charges no courier fee on a collection order', async () => {
  assert.deepEqual(cents([line(450)], 'collection_emalahleni'), { ok: true, cents: 45000 })
})

await check('ignores the unit_price the browser submitted', async () => {
  // what a tampered checkout would send: a real product, a made-up price.
  // orderTotalCents never looks at unit_price, so it cannot be fooled by it.
  const tampered = { quantity: 1, unit_price: 0.01, products: { price: 450 } }
  assert.deepEqual(cents([tampered], 'collection_emalahleni'), { ok: true, cents: 45000 })
})

await check('rounds rands-and-cents prices without drifting', async () => {
  // 19.99 x 3 is 59.969999... in binary floating point
  assert.deepEqual(cents([line(19.99, 3)], 'collection_emalahleni'), { ok: true, cents: 5997 })
})

await check('refuses an order whose product row is missing', async () => {
  assert.equal(cents([{ quantity: 1, products: null }], 'delivery_door').ok, false)
})

await check('refuses a line with a fractional or zero quantity', async () => {
  assert.equal(cents([line(450, 0)], 'delivery_door').ok, false)
  assert.equal(cents([line(450, 1.5)], 'delivery_door').ok, false)
})

await check('refuses a negative price rather than crediting it', async () => {
  assert.equal(cents([line(450), line(-500)], 'delivery_door').ok, false)
})

await check('refuses an empty order', async () => {
  assert.equal(cents([], 'delivery_door').ok, false)
})

await check('falls back to a zero fee for an unknown fulfillment value', async () => {
  assert.deepEqual(cents([line(450)], 'something_new'), { ok: true, cents: 45000 })
})

for (const [status, name, message] of results) {
  console.log(`  ${status === 'pass' ? '✓' : '✗'} ${name}${message ? ` — ${message}` : ''}`)
}

const failed = results.filter(([s]) => s === 'FAIL').length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
