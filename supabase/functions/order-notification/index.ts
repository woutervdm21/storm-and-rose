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

// Kept in step with src/lib/fulfillment.js — the function runs in Deno and
// cannot import from the Vite app.
const FULFILLMENT: Record<string, { label: string; fee: number }> = {
  collection_emalahleni: { label: 'Collection · Emalahleni',     fee: 0   },
  collection_middelburg: { label: 'Collection · Middelburg',     fee: 0   },
  delivery_door:         { label: 'Courier Guy · Door-to-Door',  fee: 130 },
  delivery_locker:       { label: 'Courier Guy · Pudo Locker',   fee: 80  },
  delivery:              { label: 'Delivery',                    fee: 100 },
}

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

  // the short code the customer is told to use as their EFT reference —
  // must match OrderConfirmation.jsx so payments can be matched to orders
  const reference = `#${String(order.id).slice(0, 8).toUpperCase()}`

  const method   = FULFILLMENT[order.fulfillment] ?? { label: order.fulfillment, fee: 0 }
  const subtotal = (lines ?? []).reduce((sum, l) => sum + l.quantity * l.unit_price, 0)
  const total    = subtotal + method.fee

  const itemRows = (lines ?? []).map(l => {
    const name = l.products?.name ?? 'Unknown item'
    const variant = l.variant ? ` — ${l.variant}` : ''
    return `<tr>
      <td style="padding:6px 0">${name}${variant} × ${l.quantity}</td>
      <td style="padding:6px 0;text-align:right">${money(l.quantity * l.unit_price)}</td>
    </tr>`
  }).join('')

  const totalRows = `
    <tr><td colspan="2" style="border-top:1px solid #e8dde0;padding-top:8px"></td></tr>
    <tr>
      <td style="padding:3px 0;color:#666">Subtotal</td>
      <td style="padding:3px 0;text-align:right;color:#666">${money(subtotal)}</td>
    </tr>
    ${method.fee > 0 ? `<tr>
      <td style="padding:3px 0;color:#666">${method.label}</td>
      <td style="padding:3px 0;text-align:right;color:#666">${money(method.fee)}</td>
    </tr>` : ''}
    <tr>
      <td style="padding:8px 0 0;font-weight:600;font-size:15px">Total</td>
      <td style="padding:8px 0 0;text-align:right;font-weight:600;font-size:15px">${money(total)}</td>
    </tr>`

  const address = [
    order.shipping_line1, order.shipping_line2, order.shipping_city,
    order.shipping_province, order.shipping_postal,
  ].filter(Boolean).join(', ')

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px">
      <h2 style="color:#6D2E46;margin-bottom:4px">New order ${reference}</h2>
      <p style="color:#666;margin-top:0;font-size:13px">
        Customer pays by EFT using reference <strong>Order ${reference}</strong><br>
        <span style="color:#999">${order.id}</span>
      </p>

      <h3 style="color:#6D2E46;margin-bottom:4px">Customer</h3>
      <p style="margin-top:0">
        ${order.customer_name}<br>
        ${order.customer_phone ?? ''}<br>
        ${order.customer_email ?? 'no email given'}
      </p>

      <h3 style="color:#6D2E46;margin-bottom:4px">Fulfillment</h3>
      <p style="margin-top:0">
        ${method.label}${address ? `<br>${address}` : ''}
      </p>

      <h3 style="color:#6D2E46;margin-bottom:4px">Items</h3>
      <table style="width:100%;border-collapse:collapse">${itemRows}${totalRows}</table>
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
      subject: `New order ${reference} — ${order.customer_name} — ${money(total)}`,
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
