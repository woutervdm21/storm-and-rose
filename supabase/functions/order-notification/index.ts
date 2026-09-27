// Emails the shop when a new order lands, and sends the customer their copy.
//
// Triggered by a Supabase Database Webhook on INSERT into `orders` — not by
// the checkout page — so the mail still goes out if the customer's browser
// dies between placing the order and the request finishing, and so a visitor
// can't fire it themselves.
//
// The customer copy here is the EFT one: banking details and what to reference.
// A card customer gets nothing at this point, because they have not paid yet —
// their receipt is sent by yoco-webhook once the payment is confirmed.
//
// Env vars (set with `supabase secrets set`):
//   RESEND_API_KEY  — from resend.com
//   ORDER_EMAIL_TO  — where notifications go (Stormyvisions@yahoo.com)
//   ORDER_EMAIL_FROM— verified sender, e.g. orders@stormandrose.co.za
//   WEBHOOK_SECRET  — shared secret, checked against the webhook's header

import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  shopNotificationEmail,
  customerEftEmail,
  sendEmail,
} from '../_shared/order-email.ts'

// how long to wait for checkout to finish saving the items: 8 × 0.4s. Kept
// well under the ~5s the database's web request waits for a reply.
const ITEM_WAIT_ATTEMPTS = 8
const ITEM_WAIT_MS       = 400

Deno.serve(async (req) => {
  // only the database webhook may call this
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Forbidden', { status: 403 })
  }

  const { record: order } = await req.json()

  // the webhook payload has the order row but not its line items
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  // Checkout saves the items a moment AFTER the order, and this webhook fires
  // on the order — so it can arrive before the items exist. Sending then would
  // email an empty order asking for only the delivery fee. Wait for them.
  let lines: any[] = []
  for (let attempt = 0; attempt < ITEM_WAIT_ATTEMPTS; attempt++) {
    const { data } = await supabase
      .from('order_items')
      .select('quantity, unit_price, variant, products(name)')
      .eq('order_id', order.id)
    lines = data ?? []
    if (lines.length) break
    await new Promise(r => setTimeout(r, ITEM_WAIT_MS))
  }

  // still nothing: the items failed to save. Tell the shop, but don't send the
  // customer a payment request for the wrong amount.
  const itemsMissing = lines.length === 0
  if (itemsMissing) console.error('Order has no items after waiting', order.id)

  const shop = shopNotificationEmail(order, lines ?? [])

  const shopSend = await sendEmail({
    to:             Deno.env.get('ORDER_EMAIL_TO')!,
    subject:        shop.subject,
    html:           shop.html,
    // replying to the notification reaches the customer
    replyTo:        order.customer_email,
    idempotencyKey: `order-${order.id}`,
  })

  if (!shopSend.ok) {
    console.error('Shop notification failed', shopSend.status, shopSend.body)
    // non-2xx tells the database webhook to retry
    return new Response('Send failed', { status: 500 })
  }

  // Customer copy. Card orders are skipped here on purpose — see the note at
  // the top. Email is required at checkout, but orders placed before that was
  // true have none, so this still has to cope with a missing address.
  const payingByCard = order.payment_method === 'yoco'

  if (!payingByCard && order.customer_email && !itemsMissing) {
    const customer = customerEftEmail(order, lines ?? [])

    const customerSend = await sendEmail({
      to:             order.customer_email,
      subject:        customer.subject,
      html:           customer.html,
      replyTo:        Deno.env.get('ORDER_EMAIL_TO'),
      idempotencyKey: `order-customer-${order.id}`,
    })

    // The shop has already been told about the order, so a failure here is
    // logged rather than retried — a retry would re-send the shop's copy too,
    // and Resend's idempotency window will not hold forever.
    if (!customerSend.ok) {
      console.error('Customer confirmation failed', order.id, customerSend.status, customerSend.body)
    }
  }

  return new Response('ok')
})
