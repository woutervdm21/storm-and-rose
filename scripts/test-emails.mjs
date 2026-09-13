// Renders the three order emails and checks what each one says, then writes
// them to disk so they can be opened in a browser and looked at.
//
// The builders are pure, so this sends nothing and needs no Resend key.
//
//   node scripts/test-emails.mjs            # assertions only
//   node scripts/test-emails.mjs --write    # also write .preview/*.html

import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import {
  shopNotificationEmail, customerEftEmail, customerPaidEmail, EFT, money,
} from '../supabase/functions/_shared/order-email.ts'

const LINES = [
  { quantity: 1, unit_price: 160, variant: null,     products: { name: 'Cloud Blooms - Grand' } },
  { quantity: 2, unit_price: 60,  variant: 'Zephyr', products: { name: 'Little Luxuries' } },
]

const collectionOrder = {
  id: '2f1c9d8e-4b6a-47c1-9f3e-0a5b7c2d1e8f',
  customer_name: 'Thandi Mokoena',
  customer_email: 'thandi@example.com',
  customer_phone: '072 000 0000',
  fulfillment: 'collection_emalahleni',
  payment_method: 'eft',
}

const deliveryOrder = {
  ...collectionOrder,
  fulfillment: 'delivery_door',
  payment_method: 'yoco',
  shipping_line1: '12 Rose Street',
  shipping_line2: 'Unit 4',
  shipping_city: 'Middelburg',
  shipping_province: 'Mpumalanga',
  shipping_postal: '1050',
}

const results = []
const check = (name, fn) => {
  try { fn(); results.push(['pass', name]) }
  catch (err) { results.push(['FAIL', name, err.message]) }
}

// 160 + (2 x 60) = 280, plus R130 door-to-door = 410
const SUBTOTAL = 280

check('EFT email quotes the subtotal when collecting', () => {
  const { html } = customerEftEmail(collectionOrder, LINES)
  assert.ok(html.includes(money(SUBTOTAL)), 'total missing')
})

check('EFT email adds the courier fee when delivering', () => {
  const { html } = customerEftEmail({ ...deliveryOrder, payment_method: 'eft' }, LINES)
  assert.ok(html.includes(money(SUBTOTAL + 130)), 'delivered total missing')
})

check('EFT email carries the banking details and the reference', () => {
  const { html, subject } = customerEftEmail(collectionOrder, LINES)
  assert.ok(html.includes(EFT.account), 'account number missing')
  assert.ok(html.includes(EFT.branch), 'branch code missing')
  assert.ok(html.includes('Order #2F1C9D8E'), 'payment reference missing')
  assert.ok(subject.includes('#2F1C9D8E'), 'subject reference missing')
})

check('EFT email gives the collection address, not a delivery block', () => {
  const { html } = customerEftEmail(collectionOrder, LINES)
  assert.ok(html.includes('4 Judith Street'), 'collection address missing')
  assert.ok(!html.includes('Delivery</h3>'), 'should not show a delivery block')
})

check('paid email does NOT repeat the banking details', () => {
  // a customer who has already paid by card must not be shown a way to pay again
  const { html } = customerPaidEmail(deliveryOrder, LINES)
  assert.ok(!html.includes(EFT.account), 'banking details leaked into the receipt')
  assert.ok(html.includes('Paid in full'), 'paid confirmation missing')
})

check('paid email shows the delivery address for a courier order', () => {
  const { html } = customerPaidEmail(deliveryOrder, LINES)
  assert.ok(html.includes('12 Rose Street'), 'shipping address missing')
  assert.ok(html.includes(money(SUBTOTAL + 130)), 'delivered total missing')
})

check('paid email subject reads as a receipt', () => {
  assert.match(customerPaidEmail(deliveryOrder, LINES).subject, /Payment received/)
})

check('shop email flags a card order as not yet paid', () => {
  const { subject, html } = shopNotificationEmail(deliveryOrder, LINES)
  assert.ok(subject.endsWith('(card)'), 'subject should mark card orders')
  assert.ok(html.includes('before shipping'), 'missing the warning not to ship yet')
})

check('shop email tells an EFT order by its reference', () => {
  const { subject, html } = shopNotificationEmail(collectionOrder, LINES)
  assert.ok(!subject.includes('(card)'), 'EFT order marked as card')
  assert.ok(html.includes('Order #2F1C9D8E'), 'EFT reference missing')
})

check('a one-word name does not break the greeting', () => {
  const { html } = customerPaidEmail({ ...deliveryOrder, customer_name: 'Candice' }, LINES)
  assert.ok(html.includes('Thank you, Candice!'), 'greeting missing')
})

check('an order with no items still renders', () => {
  const { html } = customerEftEmail(collectionOrder, [])
  assert.ok(html.includes(money(0)), 'empty order should total zero')
})

for (const [status, name, message] of results) {
  console.log(`  ${status === 'pass' ? '✓' : '✗'} ${name}${message ? ` — ${message}` : ''}`)
}

if (process.argv.includes('--write')) {
  mkdirSync('.preview', { recursive: true })
  const files = {
    'customer-eft.html':  customerEftEmail(collectionOrder, LINES).html,
    'customer-paid.html': customerPaidEmail(deliveryOrder, LINES).html,
    'shop-card.html':     shopNotificationEmail(deliveryOrder, LINES).html,
  }
  for (const [name, html] of Object.entries(files)) {
    writeFileSync(`.preview/${name}`, html)
    console.log(`  wrote .preview/${name}`)
  }
}

const failed = results.filter(([s]) => s === 'FAIL').length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
