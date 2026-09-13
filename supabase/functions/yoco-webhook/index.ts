// Receives payment events from Yoco and is the only thing that marks an order
// paid.
//
// The customer's browser is never trusted for this. successUrl can be opened
// by anyone with the link, whether they paid or not, so the redirect only
// changes what the confirmation page *says* — this function changes the order.
//
// Deploy WITHOUT JWT verification, since Yoco has no Supabase token:
//   npx supabase functions deploy yoco-webhook --no-verify-jwt
//
// Env vars (set with `supabase secrets set`):
//   YOCO_WEBHOOK_SECRET — the whsec_… returned when the webhook was registered

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { verifyWebhookSignature } from '../_shared/yoco-signature.ts'
import { customerPaidEmail, sendEmail } from '../_shared/order-email.ts'

Deno.serve(async (req) => {
  const rawBody = await req.text()

  const verified = await verifyWebhookSignature({
    id:              req.headers.get('webhook-id'),
    timestamp:       req.headers.get('webhook-timestamp'),
    signatureHeader: req.headers.get('webhook-signature'),
    body:            rawBody,
    secret:          Deno.env.get('YOCO_WEBHOOK_SECRET'),
  })

  if (!verified.ok) {
    console.error('Webhook rejected:', verified.reason)
    return new Response('Invalid signature', { status: 401 })
  }

  const event = JSON.parse(rawBody)

  // Anything we do not act on is still acknowledged — a non-2xx makes Yoco
  // retry an event that would never succeed.
  if (event.type !== 'payment.succeeded') {
    console.log('Ignoring Yoco event', event.type, event.id)
    return new Response('ok')
  }

  const orderId = event.payload?.metadata?.order_id
  if (!orderId) {
    console.error('payment.succeeded with no order_id in metadata', event.id)
    return new Response('ok')
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Every column, deliberately. Naming them means a column the receipt wants
  // but the table does not have fails the whole select, and a failed select
  // is indistinguishable from an order that isn't there — a payment then
  // looks like a stranger's and is never marked paid. The email builders
  // already cope with a field being absent.
  // maybeSingle, not single: single() calls "no such row" an error, which
  // would send a genuinely unknown order down the retry path below and have
  // Yoco redeliver it forever. Here a missing row is data: null, and only a
  // real query failure sets the error.
  const { data: order, error: lookupError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()

  // A failed query is not a missing order. Yoco must retry this one, so it
  // answers 500 rather than swallowing a real payment.
  if (lookupError) {
    console.error('Order lookup failed', orderId, event.id, lookupError.message)
    return new Response('Lookup failed', { status: 500 })
  }

  if (!order) {
    console.error('payment.succeeded for unknown order', orderId, event.id)
    return new Response('ok')
  }

  // the amount we asked Yoco to charge, against what was charged. A mismatch
  // means the two sides disagree about the order, so a human should look
  // before it is treated as settled.
  if (order.amount_cents != null && Number(event.payload.amount) !== Number(order.amount_cents)) {
    console.error(
      'Payment amount mismatch', orderId,
      'expected', order.amount_cents, 'got', event.payload.amount,
    )
    return new Response('ok')
  }

  // Only an order still awaiting payment moves. Yoco retries on any non-2xx,
  // so this runs more than once for the same payment, and an order already
  // marked shipped must not be dragged back to paid.
  const { data: updated, error } = await supabase
    .from('orders')
    .update({
      status:          'paid',
      paid_at:         new Date().toISOString(),
      yoco_payment_id: event.payload.id,
    })
    .eq('id', orderId)
    .eq('status', 'pending_payment')
    .select('id')

  if (error) {
    // a real failure — let Yoco retry
    console.error('Could not mark order paid', orderId, error)
    return new Response('Update failed', { status: 500 })
  }

  // No row matched, so this is a retry of an event already handled, or the
  // order has since moved on. Either way it is settled, and the customer has
  // had their receipt — do not send a second one.
  if (!updated?.length) {
    console.log('Order already settled, nothing to do', orderId)
    return new Response('ok')
  }

  console.log('Order marked paid', orderId, event.payload.id)

  // The receipt. This is the customer's proof of payment, so it is sent here
  // rather than when the order was placed — at that point they had not paid.
  if (order.customer_email) {
    const { data: lines } = await supabase
      .from('order_items')
      .select('quantity, unit_price, variant, products(name)')
      .eq('order_id', orderId)

    const receipt = customerPaidEmail(order, lines ?? [])

    const sent = await sendEmail({
      to:             order.customer_email,
      subject:        receipt.subject,
      html:           receipt.html,
      replyTo:        Deno.env.get('ORDER_EMAIL_TO'),
      idempotencyKey: `order-paid-${orderId}`,
    })

    // Logged, not retried. The payment is recorded and the order is paid;
    // making Yoco retry the whole event over a failed email would risk
    // re-processing a settled payment for the sake of a resend.
    if (!sent.ok) {
      console.error('Receipt failed to send', orderId, sent.status, sent.body)
    }
  } else {
    console.log('No customer email on order, receipt skipped', orderId)
  }

  return new Response('ok')
})
