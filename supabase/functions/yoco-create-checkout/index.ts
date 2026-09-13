// Creates a Yoco checkout for an existing order and hands the browser back the
// URL to send the customer to.
//
// Called by Checkout.jsx straight after the order row is inserted. It runs
// server-side for two reasons: the Yoco secret key must never reach a browser,
// and the amount must be worked out from data the customer cannot edit.
//
// That second one matters here. `anon` may insert into orders and order_items
// with no check (sql/004), so `order_items.unit_price` is whatever the customer's
// browser said it was. We therefore ignore it and re-read `products.price`, then
// add the courier fee from our own table. The number sent to Yoco is ours.
//
// Env vars (set with `supabase secrets set`):
//   YOCO_SECRET_KEY — sk_test_… while testing, sk_live_… once live
//   SITE_URL        — https://stormandrose.co.za (no trailing slash)

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { fulfillmentFor } from '../_shared/fulfillment.ts'

const YOCO_CHECKOUTS_URL = 'https://payments.yoco.com/api/checkouts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const { order_id } = await req.json().catch(() => ({ order_id: null }))
  if (!order_id) return json({ error: 'order_id required' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status, fulfillment')
    .eq('id', order_id)
    .single()

  if (orderError || !order) return json({ error: 'Order not found' }, 404)

  // an order that is already settled must not be payable a second time
  if (order.status !== 'pending_payment') {
    return json({ error: 'Order is not awaiting payment' }, 409)
  }

  const { data: lines, error: itemsError } = await supabase
    .from('order_items')
    .select('quantity, products(price)')
    .eq('order_id', order_id)

  if (itemsError || !lines?.length) return json({ error: 'Order has no items' }, 400)

  // prices come from `products`, never from the submitted order_items
  const subtotal = lines.reduce(
    (sum, l) => sum + Number(l.products?.price ?? 0) * Number(l.quantity),
    0,
  )
  const total = subtotal + fulfillmentFor(order.fulfillment).fee
  const amountInCents = Math.round(total * 100)

  if (!Number.isFinite(amountInCents) || amountInCents < 100) {
    return json({ error: 'Order total is not payable' }, 400)
  }

  // the short code the customer already sees as their EFT reference
  const reference = String(order.id).slice(0, 8).toUpperCase()
  const site = Deno.env.get('SITE_URL') ?? 'https://stormandrose.co.za'
  const back = (outcome: string) =>
    `${site}/order-confirmation?order=${order.id}&payment=${outcome}`

  // recorded before Yoco is called, not after: the webhook can arrive while
  // this function is still running, and it checks the amount paid against this
  await supabase
    .from('orders')
    .update({ amount_cents: amountInCents, payment_method: 'yoco' })
    .eq('id', order.id)

  const res = await fetch(YOCO_CHECKOUTS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('YOCO_SECRET_KEY')}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      amount:     amountInCents,
      currency:   'ZAR',
      successUrl: back('success'),
      cancelUrl:  back('cancelled'),
      failureUrl: back('failed'),
      // the payment.succeeded webhook carries no checkout id, so this is the
      // only thread back to the order. Without it a payment cannot be matched.
      metadata: { order_id: String(order.id), reference },
    }),
  })

  const checkout = await res.json().catch(() => null)

  if (!res.ok || !checkout?.redirectUrl) {
    console.error('Yoco checkout failed', res.status, checkout)
    return json({ error: 'Could not start payment' }, 502)
  }

  await supabase
    .from('orders')
    .update({ yoco_checkout_id: checkout.id })
    .eq('id', order.id)

  return json({ redirectUrl: checkout.redirectUrl })
})
