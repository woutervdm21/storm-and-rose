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
    .select('status, amount_cents')
    .eq('id', order_id)
    .single()

  if (!data) return reply({ error: 'Order not found' }, 404)

  // deliberately narrow — status and total, nothing about the customer
  return reply({ status: data.status, amount_cents: data.amount_cents })
})
