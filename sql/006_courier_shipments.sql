-- NOT YET APPLIED. Run in the Supabase SQL editor before deploying the
-- `courier` Edge Function.
--
-- Records a Courier Guy booking on its order, so the admin can see it was
-- booked, reprint the waybill, and give the customer a tracking reference.
--
-- courier_booked_at is set *before* the booking is sent. The function only
-- books when it can move this column off null, which is what stops a double
-- click from booking (and billing) the same parcel twice.

alter table orders
  add column if not exists courier_booked_at    timestamptz,
  add column if not exists courier_shipment_id  bigint,
  add column if not exists courier_tracking_ref text,
  add column if not exists courier_cost         numeric(10,2);
