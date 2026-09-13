// Works out what to charge for an order, in cents.
//
// This is the number that goes to Yoco, so it is deliberately built only from
// things the customer cannot edit: `products.price` joined through
// order_items, plus our own courier fee. `order_items.unit_price` is whatever
// the checkout's browser submitted — sql/004 lets anon insert anything — and
// is never read here.
//
// Kept separate from the function that calls it so it can be tested against
// the awkward cases without a database. See scripts/test-yoco.mjs.

import { fulfillmentFor } from './fulfillment.ts'

export type OrderLine = {
  quantity: number
  // supabase-js gives the joined row as an object for a to-one relation
  products: { price: number } | null
}

export type Total = { ok: true; cents: number } | { ok: false; reason: string }

// Yoco's smallest charge. Anything under it is a broken order, not a cheap one.
export const MINIMUM_CENTS = 100

export function orderTotalCents(lines: OrderLine[], fulfillment: string): Total {
  if (!lines?.length) return { ok: false, reason: 'order has no items' }

  let subtotal = 0
  for (const line of lines) {
    const price = Number(line.products?.price)
    const qty   = Number(line.quantity)

    // a line we cannot price is not something to guess at or skip over —
    // charging for the rest would undercharge for the order
    if (!Number.isFinite(price) || price < 0) return { ok: false, reason: 'a line has no usable price' }
    if (!Number.isInteger(qty) || qty < 1)    return { ok: false, reason: 'a line has no usable quantity' }

    subtotal += price * qty
  }

  const total = subtotal + fulfillmentFor(fulfillment).fee

  // prices are rands with cents, so round the money, never the multiplication
  const cents = Math.round(total * 100)
  if (!Number.isFinite(cents) || cents < MINIMUM_CENTS) {
    return { ok: false, reason: `total of ${cents} cents is not payable` }
  }

  return { ok: true, cents }
}
