-- APPLIED to project enpyghydpklvuhaicwrr on 2026-09-12.
--
-- Customers are not signed in, so the checkout runs as the `anon` role.
-- `orders` and `order_items` had no insert policy for it, so row-level
-- security rejected every order with 42501 — "new row violates row-level
-- security policy". It only ever appeared to work in a browser that already
-- held an admin session from /admin, which inserted as `authenticated`.
--
-- Insert only, deliberately. No select policy for `anon`, so a customer can
-- place an order but nobody can read anyone else's back. That is why the
-- checkout mints the order id itself instead of asking for the row back.

alter table orders      enable row level security;
alter table order_items enable row level security;

drop policy if exists "anyone can place an order"        on orders;
drop policy if exists "anyone can add items to an order" on order_items;

create policy "anyone can place an order"
  on orders for insert
  to anon, authenticated
  with check (true);

create policy "anyone can add items to an order"
  on order_items for insert
  to anon, authenticated
  with check (true);
