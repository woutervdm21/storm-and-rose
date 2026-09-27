-- APPLIED to project enpyghydpklvuhaicwrr on 2026-09-27.
--
-- "public insert orders" (created outside these migrations, with check true)
-- let anyone insert an order with any status — including 'paid' or
-- 'shipped'. Postgres allows a row if ANY permissive policy allows it, so it
-- overrode the strict "anyone can place an order" from sql/005, which
-- checkout already satisfies. Found 2026-09-27, when a probe insert with
-- status 'shipped' was accepted.

drop policy if exists "public insert orders" on orders;

-- afterwards: orders should list only "admin manage orders" and
-- "anyone can place an order"
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where tablename in ('orders', 'order_items')
order by tablename, policyname;
