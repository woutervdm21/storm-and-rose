-- APPLIED to project enpyghydpklvuhaicwrr on 2026-09-12.
--
-- Splitting delivery into two Courier Guy methods changed what the checkout
-- stores in orders.fulfillment, but the original CHECK constraint still only
-- allowed 'delivery' — so every delivery order was rejected by the database.
--
-- 'delivery' stays in the list so orders placed before the split remain valid.

alter table orders drop constraint if exists orders_fulfillment_check;

alter table orders add constraint orders_fulfillment_check
  check (fulfillment = any (array[
    'collection_emalahleni',
    'collection_middelburg',
    'delivery_door',
    'delivery_locker',
    'delivery'
  ]));
