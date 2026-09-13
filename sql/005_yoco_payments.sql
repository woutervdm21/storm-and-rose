-- NOT YET APPLIED — run in the Supabase SQL editor before deploying the
-- yoco-* functions.
--
-- Columns the Yoco flow needs on `orders`. No new status: a card payment lands
-- on the existing `paid`, so AdminOrders and the stock-on-ship rule keep
-- working untouched.
--
--   payment_method   'eft' (or null, for every order placed before this) / 'yoco'
--   amount_cents     what we asked Yoco to charge, in cents. The webhook
--                    compares the amount actually paid against it, so the
--                    figure has to be stored when the checkout is created.
--   yoco_checkout_id the checkout we sent the customer to
--   yoco_payment_id  the payment that settled it, for the Yoco dashboard
--   paid_at          when the webhook confirmed payment

alter table orders add column if not exists payment_method   text;
alter table orders add column if not exists amount_cents     integer;
alter table orders add column if not exists yoco_checkout_id text;
alter table orders add column if not exists yoco_payment_id  text;
alter table orders add column if not exists paid_at          timestamptz;

-- looking an order up by its Yoco ids, when reconciling against the dashboard
create index if not exists orders_yoco_checkout_id_idx on orders (yoco_checkout_id);
create index if not exists orders_yoco_payment_id_idx  on orders (yoco_payment_id);

-- The insert policy from 004 is `with check (true)`, so a customer's browser
-- could set these itself. Nothing reads them as a source of truth except the
-- webhook, which re-reads amount_cents server-side, but keep them honest
-- anyway: a freshly placed order may not arrive pre-paid.
drop policy if exists "anyone can place an order" on orders;

create policy "anyone can place an order"
  on orders for insert
  to anon, authenticated
  with check (
    status = 'pending_payment'
    and paid_at is null
    and yoco_payment_id is null
    and amount_cents is null
  );
