// Emails the shop when a new order lands.
//
// Triggered by a Supabase Database Webhook on INSERT into `orders` — not by
// the checkout page — so the mail still goes out if the customer's browser
// dies between placing the order and the request finishing, and so a visitor
// can't fire it themselves.
//
// Env vars (set with `supabase secrets set`):
//   RESEND_API_KEY  — from resend.com
//   ORDER_EMAIL_TO  — where notifications go (Stormyvisions@yahoo.com)
//   ORDER_EMAIL_FROM— verified sender, e.g. orders@stormandrose.co.za
//   WEBHOOK_SECRET  — shared secret, checked against the webhook's header

import { createClient } from 'jsr:@supabase/supabase-js@2'

const rand = () => crypto.randomUUID()

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
  const { data: lines } = await supabase
    .from('order_items')
    .select('quantity, unit_price, variant, products(name)')
    .eq('order_id', order.id)

  const money = (n: number) => `R ${Number(n).toFixed(2)}`

  const itemRows = (lines ?? []).map(l => {
    const name = l.products?.name ?? 'Unknown item'
    const variant = l.variant ? ` — ${l.variant}` : ''
    return `<tr>
      <td style="padding:6px 0">${name}${variant} × ${l.quantity}</td>
      <td style="padding:6px 0;text-align:right">${money(l.quantity * l.unit_price)}</td>
    </tr>`
  }).join('')

  const address = [
    order.shipping_line1, order.shipping_line2, order.shipping_city,
    order.shipping_province, order.shipping_postal,
  ].filter(Boolean).join(', ')

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px">
      <h2 style="color:#6D2E46;margin-bottom:4px">New order</h2>
      <p style="color:#666;margin-top:0">Order ${order.id}</p>

      <h3 style="color:#6D2E46;margin-bottom:4px">Customer</h3>
      <p style="margin-top:0">
        ${order.customer_name}<br>
        ${order.customer_phone ?? ''}<br>
        ${order.customer_email ?? 'no email given'}
      </p>

      <h3 style="color:#6D2E46;margin-bottom:4px">Fulfillment</h3>
      <p style="margin-top:0">
        ${order.fulfillment}${address ? `<br>${address}` : ''}
      </p>

      <h3 style="color:#6D2E46;margin-bottom:4px">Items</h3>
      <table style="width:100%;border-collapse:collapse">${itemRows}</table>
    </div>`

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type':  'application/json',
      // lets Resend drop a duplicate if the webhook retries
      'Idempotency-Key': `order-${order.id}`,
    },
    body: JSON.stringify({
      from:    Deno.env.get('ORDER_EMAIL_FROM'),
      to:      [Deno.env.get('ORDER_EMAIL_TO')],
      subject: `New order — ${order.customer_name}`,
      html,
      // replying to the notification reaches the customer, when they gave an address
      ...(order.customer_email ? { reply_to: order.customer_email } : {}),
    }),
  })

  if (!res.ok) {
    console.error('Resend failed', res.status, await res.text())
    // non-2xx tells the webhook to retry
    return new Response('Send failed', { status: 500 })
  }

  return new Response('ok')
})
