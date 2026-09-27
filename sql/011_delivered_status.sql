-- APPLIED to project enpyghydpklvuhaicwrr on 2026-09-27.
-- deployed — the courier function writes 'delivered' and these columns.
--
-- Adds a 'delivered' order status, and the latest Courier Guy tracking status.
-- The Orders page asks Courier Guy about shipped orders when it opens and
-- moves an order to 'delivered' once the courier reports it delivered.
--
-- Status flow: pending_payment → paid → shipped → delivered

alter table orders drop constraint if exists orders_status_check;

alter table orders add constraint orders_status_check
  check (status in ('pending_payment', 'paid', 'shipped', 'delivered'));

alter table orders
  add column if not exists courier_status     text,         -- e.g. 'in-transit', as Courier Guy spells it
  add column if not exists courier_checked_at timestamptz,  -- when we last asked
  add column if not exists delivered_at       timestamptz;

-- afterwards: exactly ONE status check should be listed, and it must include
-- 'delivered'. A second one means the old check had another name and still
-- blocks 'delivered' — drop that one by its name.
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'orders'::regclass
  and contype = 'c'
  and pg_get_constraintdef(oid) like '%status%';
