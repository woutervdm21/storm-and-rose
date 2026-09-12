-- Fires the order-notification Edge Function whenever an order is created.
--
-- Easiest path is the dashboard: Database → Webhooks → Create a new hook
--   Table:      orders
--   Events:     Insert
--   Type:       Supabase Edge Functions → order-notification
--   HTTP header: x-webhook-secret = <the same value as the WEBHOOK_SECRET secret>
--
-- The SQL below does the same thing, if you would rather not use the UI.
-- Replace <PROJECT_REF> and <WEBHOOK_SECRET> before running.

create extension if not exists pg_net;

create or replace function notify_new_order()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/order-notification',
    headers := jsonb_build_object(
                 'Content-Type',      'application/json',
                 'x-webhook-secret',  '<WEBHOOK_SECRET>'
               ),
    body    := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$$;

drop trigger if exists on_order_created on orders;

create trigger on_order_created
  after insert on orders
  for each row
  execute function notify_new_order();
