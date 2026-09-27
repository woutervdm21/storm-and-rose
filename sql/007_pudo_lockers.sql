-- NOT YET APPLIED. Run in the Supabase SQL editor BEFORE the checkout change
-- is pushed — checkout writes these columns, and an insert naming a column
-- that doesn't exist fails, which would stop every order.
--
-- The Pudo locker a customer picks at checkout. The id is what Courier Guy
-- books against; name and address are kept so the order, emails and admin
-- can say where it's going without asking Courier Guy again.
--
-- The customer's browser writes these (anon insert, sql/005), so the id is
-- only trusted as far as Courier Guy accepting it when the order is booked.

alter table orders
  add column if not exists pudo_locker_id      text,
  add column if not exists pudo_locker_name    text,
  add column if not exists pudo_locker_address text;
