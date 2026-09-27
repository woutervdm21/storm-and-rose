// Tells the confirmation page whether an order has been paid yet.
//
// `anon` has no select policy on orders (sql/004) and should not get one — a
// blanket read policy would let anyone dump every customer's details. So the
// one field the customer legitimately needs comes back through here instead,
// and only to someone who already knows the order's uuid.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const { order_id } = await req.json().catch(() => ({ order_id: null }))

  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  if (!order_id) return reply({ error: 'order_id required' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data } = await supabase
    .from('orders')
    .select('status, amount_cents, delivery_fee, order_items(quantity, unit_price)')
    .eq('id', order_id)
    .single()

  if (!data) return reply({ error: 'Order not found' }, 404)

  // A card order's amount is fixed when its Yoco checkout is made. An EFT
  // order has none, so work it out here from the saved prices — which the
  // database sets from products (sql/014), not from the customer's browser.
  let cents = data.amount_cents
  if (cents == null) {
    const items = (data.order_items ?? []).reduce(
      (sum: number, i: { quantity: number; unit_price: number }) => sum + i.quantity * Number(i.unit_price), 0)
    cents = Math.round((items + Number(data.delivery_fee ?? 0)) * 100)
  }

  // deliberately narrow — status and total, nothing about the customer
  return reply({ status: data.status, amount_cents: cents })
})
