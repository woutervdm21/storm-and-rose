-- NOT YET APPLIED. Run in the Supabase SQL editor BEFORE the matching code is
-- pushed — admin will start writing 'cancelled'.
--
-- Adds a 'cancelled' order status.
-- Status flow: pending_payment → paid → shipped → delivered, or cancelled

alter table orders drop constraint if exists orders_status_check;

alter table orders add constraint orders_status_check
  check (status in ('pending_payment', 'paid', 'shipped', 'delivered', 'cancelled'));

-- afterwards: one status check, including 'cancelled'
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'orders'::regclass
  and contype = 'c'
  and pg_get_constraintdef(oid) like '%status%';
