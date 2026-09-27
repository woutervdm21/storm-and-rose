-- APPLIED to project enpyghydpklvuhaicwrr on 2026-09-27.
--
-- Saves each order's courier fee on the order itself, set by the database.
--
-- Until now the fee was looked up from the current price list every time an
-- order was shown or charged, so changing a fee would silently rewrite every
-- older order: a customer told to EFT R200 would show as R250 in admin, and a
-- card retry would charge the new amount.
--
-- The trigger sets the fee on every new order and ignores anything the
-- browser sends — anon may insert orders (sql/004), and must not be able to
-- choose its own delivery fee.
--
-- Fees here must match src/lib/fulfillment.js and
-- supabase/functions/_shared/fulfillment.ts (what checkout shows).

alter table orders add column if not exists delivery_fee numeric(10,2);

-- existing orders keep the fee they were placed at
update orders
set delivery_fee = case fulfillment
  when 'delivery_door'   then 130
  when 'delivery_locker' then 80
  when 'delivery'        then 100
  else 0
end
where delivery_fee is null;

-- new orders get the current price list
create or replace function set_delivery_fee() returns trigger
language plpgsql as $$
begin
  new.delivery_fee := case new.fulfillment
    when 'delivery_door'   then 140
    when 'delivery_locker' then 130
    when 'delivery'        then 100
    else 0
  end;
  return new;
end;
$$;

drop trigger if exists orders_set_delivery_fee on orders;

create trigger orders_set_delivery_fee
  before insert on orders
  for each row execute function set_delivery_fee();

alter table orders alter column delivery_fee set not null;
