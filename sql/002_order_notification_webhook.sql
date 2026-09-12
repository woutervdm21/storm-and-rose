-- APPLIED to project enpyghydpklvuhaicwrr on 2026-09-12.
--
-- Fires the order-notification Edge Function whenever an order is created.
-- <WEBHOOK_SECRET> below stands in for the real value, which lives only in
-- the function's secrets and in this trigger on the database — it is not
-- checked into the repo.

create extension if not exists pg_net;

create or replace function notify_new_order()
returns trigger
language plpgsql
security definer
as $fn$
begin
  perform net.http_post(
    url     := 'https://enpyghydpklvuhaicwrr.supabase.co/functions/v1/order-notification',
    headers := jsonb_build_object(
                 'Content-Type',     'application/json',
                 'x-webhook-secret', '<WEBHOOK_SECRET>'
               ),
    body    := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$fn$;

drop trigger if exists on_order_created on orders;

create trigger on_order_created
  after insert on orders
  for each row
  execute function notify_new_order();
