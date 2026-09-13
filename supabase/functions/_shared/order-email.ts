// Builds every order email the shop sends, and posts them to Resend.
//
// Three emails, one set of parts:
//   shopNotificationEmail  — to the shop, when an order is placed
//   customerEftEmail       — to the customer, when an EFT order is placed
//   customerPaidEmail      — to the customer, when a card payment is confirmed
//
// The builders are pure — they take an order and its lines and return a
// subject and some HTML — so they can be rendered and checked without sending
// anything. See scripts/test-emails.mjs. Only sendEmail() touches the network.

import { fulfillmentFor } from './fulfillment.ts'

// Mirrors the EFT block in src/pages/OrderConfirmation.jsx. A customer who
// pays against stale details here has sent money to the wrong place, so if the
// banking details ever change, change both.
export const EFT = {
  bank:    'Standard Bank',
  name:    'Storm and Rose',
  type:    'Savings',
  account: '133422836',
  branch:  '051001',
}

// Collection addresses, mirroring src/lib/fulfillment.js — the customer emails
// repeat them so nobody has to go back to the website to find where to go.
const COLLECTION_ADDRESS: Record<string, string[]> = {
  collection_emalahleni: ['4 Judith Street', 'Del Judor Ext 4, Emalahleni'],
  collection_middelburg: ['23 Seinheuwel Crescent, Pebble Creek Unit 2', 'Aerorand, Middelburg'],
}

export type OrderLine = {
  quantity: number
  unit_price: number
  variant?: string | null
  products: { name: string } | null
}

export type Order = {
  id: string
  customer_name: string
  customer_email?: string | null
  customer_phone?: string | null
  fulfillment: string
  payment_method?: string | null
  shipping_line1?: string | null
  shipping_line2?: string | null
  shipping_city?: string | null
  shipping_province?: string | null
  shipping_postal?: string | null
}

const ROSE = '#6D2E46'
const RULE = '#e8dde0'

export const money = (n: number) => `R ${Number(n).toFixed(2)}`

// the short code the customer uses as their EFT reference — must match
// OrderConfirmation.jsx so payments can be matched back to orders
export const referenceFor = (id: string) => `#${String(id).slice(0, 8).toUpperCase()}`

// everything both the shop and the customer need to see about an order
export function summarise(order: Order, lines: OrderLine[]) {
  const method   = fulfillmentFor(order.fulfillment)
  const subtotal = (lines ?? []).reduce((sum, l) => sum + l.quantity * l.unit_price, 0)

  const itemRows = (lines ?? []).map((l) => {
    const name    = l.products?.name ?? 'Unknown item'
    const variant = l.variant ? ` — ${l.variant}` : ''
    return `<tr>
      <td style="padding:6px 0">${name}${variant} × ${l.quantity}</td>
      <td style="padding:6px 0;text-align:right">${money(l.quantity * l.unit_price)}</td>
    </tr>`
  }).join('')

  const totalRows = `
    <tr><td colspan="2" style="border-top:1px solid ${RULE};padding-top:8px"></td></tr>
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
      <td style="padding:8px 0 0;text-align:right;font-weight:600;font-size:15px">${money(subtotal + method.fee)}</td>
    </tr>`

  const address = [
    order.shipping_line1, order.shipping_line2, order.shipping_city,
    order.shipping_province, order.shipping_postal,
  ].filter(Boolean).join(', ')

  return {
    method,
    subtotal,
    total: subtotal + method.fee,
    itemRows,
    totalRows,
    address,
    reference: referenceFor(order.id),
    itemsTable: `<table style="width:100%;border-collapse:collapse">${itemRows}${totalRows}</table>`,
  }
}

// The charset is declared explicitly: these emails carry en dashes, × and ·,
// and a client left to guess renders them as mojibake.
const shell = (inner: string) =>
  `<meta charset="utf-8">
   <div style="font-family:system-ui,sans-serif;max-width:520px;color:#1A1A2E">${inner}</div>`

// where the order is going, in the customer's words rather than ours
function fulfillmentBlock(order: Order): string {
  const collection = COLLECTION_ADDRESS[order.fulfillment]
  if (collection) {
    return `
      <h3 style="color:${ROSE};margin-bottom:4px">Collection</h3>
      <p style="margin-top:0">
        ${collection.join('<br>')}<br>
        <span style="color:#666">We'll contact you when your order is ready to collect.</span>
      </p>`
  }

  const { method, address } = summarise(order, [])
  return `
    <h3 style="color:${ROSE};margin-bottom:4px">Delivery</h3>
    <p style="margin-top:0">
      ${method.label}${address ? `<br>${address}` : ''}
    </p>`
}

// --- to the shop ----------------------------------------------------------

export function shopNotificationEmail(order: Order, lines: OrderLine[]) {
  const { reference, total, method, address, itemsTable } = summarise(order, lines)

  // a card order is still unpaid at this point — yoco-webhook marks it paid a
  // moment later, or never, if the payment falls over
  const payingByCard = order.payment_method === 'yoco'

  return {
    subject: `New order ${reference} — ${order.customer_name} — ${money(total)}${payingByCard ? ' (card)' : ''}`,
    html: shell(`
      <h2 style="color:${ROSE};margin-bottom:4px">New order ${reference}</h2>
      <p style="color:#666;margin-top:0;font-size:13px">
        ${payingByCard
          ? 'Paying by <strong>card</strong> — this mail goes out when the order is placed, ' +
            'so check the order shows <strong>Paid</strong> in admin before shipping.'
          : `Paying by <strong>EFT</strong> using reference <strong>Order ${reference}</strong>`}<br>
        <span style="color:#999">${order.id}</span>
      </p>

      <h3 style="color:${ROSE};margin-bottom:4px">Customer</h3>
      <p style="margin-top:0">
        ${order.customer_name}<br>
        ${order.customer_phone ?? ''}<br>
        ${order.customer_email ?? 'no email given'}
      </p>

      <h3 style="color:${ROSE};margin-bottom:4px">Fulfillment</h3>
      <p style="margin-top:0">${method.label}${address ? `<br>${address}` : ''}</p>

      <h3 style="color:${ROSE};margin-bottom:4px">Items</h3>
      ${itemsTable}`),
  }
}

// --- to the customer ------------------------------------------------------

export function customerEftEmail(order: Order, lines: OrderLine[]) {
  const { reference, total, itemsTable } = summarise(order, lines)

  return {
    subject: `Your Storm & Rose order ${reference}`,
    html: shell(`
      <h2 style="color:${ROSE};margin-bottom:4px">Thank you, ${order.customer_name.split(' ')[0]}!</h2>
      <p style="margin-top:0">
        We have your order ${reference}. To complete it, please pay
        <strong>${money(total)}</strong> by EFT using the details below.
      </p>

      <div style="background:#fdf6f7;border:1px solid ${RULE};border-radius:10px;padding:16px;margin:16px 0">
        <h3 style="color:${ROSE};margin:0 0 10px">EFT payment details</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:3px 0;color:#666">Bank</td><td style="padding:3px 0;text-align:right">${EFT.bank}</td></tr>
          <tr><td style="padding:3px 0;color:#666">Account name</td><td style="padding:3px 0;text-align:right">${EFT.name}</td></tr>
          <tr><td style="padding:3px 0;color:#666">Account type</td><td style="padding:3px 0;text-align:right">${EFT.type}</td></tr>
          <tr><td style="padding:3px 0;color:#666">Account number</td><td style="padding:3px 0;text-align:right">${EFT.account}</td></tr>
          <tr><td style="padding:3px 0;color:#666">Branch code</td><td style="padding:3px 0;text-align:right">${EFT.branch}</td></tr>
          <tr><td style="padding:3px 0;color:#666">Reference</td><td style="padding:3px 0;text-align:right"><strong>Order ${reference}</strong></td></tr>
          <tr><td style="padding:3px 0;color:#666">Amount</td><td style="padding:3px 0;text-align:right"><strong>${money(total)}</strong></td></tr>
        </table>
      </div>

      <p style="color:#8a5a68;font-size:13px;margin:0 0 16px">
        Please use <strong>Order ${reference}</strong> as your reference — it is how we match your
        payment to your order. Orders are only sent once payment reflects in our account.
      </p>

      <h3 style="color:${ROSE};margin-bottom:4px">Your order</h3>
      ${itemsTable}

      ${fulfillmentBlock(order)}

      <p style="color:#666;font-size:13px;margin-top:24px">
        Reply to this email if anything looks wrong.<br>
        <strong style="color:${ROSE}">Storm &amp; Rose</strong> — Luxury Candles &amp; Thoughtful Designs
      </p>`),
  }
}

export function customerPaidEmail(order: Order, lines: OrderLine[]) {
  const { reference, total, itemsTable } = summarise(order, lines)

  return {
    subject: `Payment received — Storm & Rose order ${reference}`,
    html: shell(`
      <h2 style="color:${ROSE};margin-bottom:4px">Thank you, ${order.customer_name.split(' ')[0]}!</h2>
      <p style="margin-top:0">
        We've received your payment of <strong>${money(total)}</strong> for order
        <strong>${reference}</strong>. Nothing further is needed from you.
      </p>

      <div style="background:#f0f9f4;border:1px solid #cfe8da;border-radius:10px;padding:12px 16px;margin:16px 0">
        <strong style="color:#2f6b4f">Paid in full</strong>
        <span style="color:#4a7a62">— we're getting your order ready now.</span>
      </div>

      <h3 style="color:${ROSE};margin-bottom:4px">Your order</h3>
      ${itemsTable}

      ${fulfillmentBlock(order)}

      <p style="color:#666;font-size:13px;margin-top:24px">
        Keep this email as your receipt. Reply to it if anything looks wrong.<br>
        <strong style="color:${ROSE}">Storm &amp; Rose</strong> — Luxury Candles &amp; Thoughtful Designs
      </p>`),
  }
}

// --- sending --------------------------------------------------------------

// `idempotencyKey` lets Resend drop a duplicate when a webhook is retried —
// give the same send the same key every time it could run twice.
export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
  replyTo?: string | null
  idempotencyKey: string
}): Promise<{ ok: boolean; status: number; body?: string }> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization':   `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type':    'application/json',
      'Idempotency-Key': opts.idempotencyKey,
    },
    body: JSON.stringify({
      from:    Deno.env.get('ORDER_EMAIL_FROM'),
      to:      [opts.to],
      subject: opts.subject,
      html:    opts.html,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
  })

  if (res.ok) return { ok: true, status: res.status }
  return { ok: false, status: res.status, body: await res.text() }
}
