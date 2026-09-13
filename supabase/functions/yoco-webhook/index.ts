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

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, amount_cents')
    .eq('id', orderId)
    .single()

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
  const { error } = await supabase
    .from('orders')
    .update({
      status:          'paid',
      paid_at:         new Date().toISOString(),
      yoco_payment_id: event.payload.id,
    })
    .eq('id', orderId)
    .eq('status', 'pending_payment')

  if (error) {
    // a real failure — let Yoco retry
    console.error('Could not mark order paid', orderId, error)
    return new Response('Update failed', { status: 500 })
  }

  console.log('Order marked paid', orderId, event.payload.id)
  return new Response('ok')
})
