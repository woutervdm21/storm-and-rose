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

// Yoco retries a failed delivery, and a replayed old event should not be
// accepted, so anything older than this is refused.
const TOLERANCE_SECONDS = 3 * 60

// compare without leaking how many bytes matched
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

const b64decode = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0))
const b64encode = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)))

async function signatureIsValid(req: Request, rawBody: string): Promise<boolean> {
  const id        = req.headers.get('webhook-id')
  const timestamp = req.headers.get('webhook-timestamp')
  const header    = req.headers.get('webhook-signature')
  const secret    = Deno.env.get('YOCO_WEBHOOK_SECRET')

  if (!id || !timestamp || !header || !secret) return false

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp))
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) {
    console.error('Webhook rejected: timestamp outside tolerance', timestamp)
    return false
  }

  // the raw body, byte for byte — re-serialising parsed JSON changes the hash
  const signedContent = `${id}.${timestamp}.${rawBody}`

  const key = await crypto.subtle.importKey(
    'raw',
    b64decode(secret.replace(/^whsec_/, '')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const expected = b64encode(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent)),
  )

  // header looks like "v1,<signature>", and may carry several space-separated
  // signatures while a secret is being rotated — any one matching is enough
  const encoder = new TextEncoder()
  return header.split(' ').some((part) => {
    const sig = part.includes(',') ? part.split(',')[1] : part
    return timingSafeEqual(encoder.encode(sig), encoder.encode(expected))
  })
}

Deno.serve(async (req) => {
  const rawBody = await req.text()

  if (!await signatureIsValid(req, rawBody)) {
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
      status:         'paid',
      paid_at:        new Date().toISOString(),
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
