-- APPLIED to project enpyghydpklvuhaicwrr on 2026-09-27.
--
-- order_items had two insert policies, both `with check (true)`: anyone could
-- add items to ANY order at any time — including one already paid. A card
-- order's amount is fixed when its Yoco checkout is created, so a customer
-- could pay for a small order and then add items to it, and admin would show
-- a paid order with goods nobody paid for.
--
-- Checkout adds items straight after creating the order, before it asks Yoco
-- for a checkout. So items are only accepted for an order that is:
--   - still pending_payment
--   - not yet sent to card payment (amount_cents is set by yoco-create-checkout)
--   - under an hour old
--
-- anon cannot read orders (RLS), so the check runs as a security definer
-- function; it only answers yes/no for one order id.

-- the order's time comes from the database, so the hour can't be stretched
create or replace function force_order_created_at() returns trigger
language plpgsql as $$
begin
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists orders_force_created_at on orders;

create trigger orders_force_created_at
  before insert on orders
  for each row execute function force_order_created_at();

create or replace function order_accepts_items(p_order_id uuid) returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from orders
    where id = p_order_id
      and status = 'pending_payment'
      and amount_cents is null
      and created_at > now() - interval '1 hour'
  );
$$;

drop policy if exists "public insert order_items"        on order_items;
drop policy if exists "anyone can add items to an order" on order_items;

create policy "customers add items to their new order"
  on order_items for insert
  to anon, authenticated
  with check (quantity > 0 and order_accepts_items(order_id));

-- afterwards: order_items should list "admin read order_items" and
-- "customers add items to their new order"
select policyname, cmd, roles, qual, with_check
from pg_policies
where tablename = 'order_items'
order by policyname;
