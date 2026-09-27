-- APPLIED to project enpyghydpklvuhaicwrr on 2026-09-27.
--
-- Pudo locker orders now go Locker to Locker (the shop drops the parcel at a
-- locker), which Courier Guy prices at R79 for a Medium compartment anywhere
-- in SA — so the locker fee comes down from R130 to R80.
--
-- Only new orders are affected; existing orders keep the fee they were
-- placed at (sql/008). Must match src/lib/fulfillment.js and
-- supabase/functions/_shared/fulfillment.ts.

create or replace function set_delivery_fee() returns trigger
language plpgsql as $$
begin
  new.delivery_fee := case new.fulfillment
    when 'delivery_door'   then 140
    when 'delivery_locker' then 80
    when 'delivery'        then 100
    else 0
  end;
  return new;
end;
$$;
