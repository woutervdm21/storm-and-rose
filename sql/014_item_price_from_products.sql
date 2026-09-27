-- NOT YET APPLIED. Run the whole file at once in the Supabase SQL editor.
--
-- order_items.unit_price was whatever the customer's browser sent (anon may
-- insert items, sql/010). Card payments were safe — yoco-create-checkout
-- re-prices from products — but the EFT email, admin totals and analytics
-- all read unit_price, so a tampered checkout could show an EFT customer
-- (and admin) a lower amount to pay.
--
-- The database now sets unit_price from products.price as each item is
-- saved, ignoring the browser. The order keeps the price it was placed at,
-- even if the product's price changes later.

create or replace function set_item_price() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_price numeric;
begin
  select price into current_price from products where id = new.product_id;
  if current_price is null then
    raise exception 'Unknown product %', new.product_id;
  end if;
  new.unit_price := current_price;
  return new;
end;
$$;

drop trigger if exists order_items_set_price on order_items;

create trigger order_items_set_price
  before insert on order_items
  for each row execute function set_item_price();

-- afterwards: any earlier order whose saved price doesn't match the product's
-- price today. Price changes explain some; a much lower price than the
-- product ever had is worth a closer look.
select o.id, o.status, o.created_at, p.name, oi.quantity, oi.unit_price, p.price as price_now
from order_items oi
join orders o   on o.id = oi.order_id
join products p on p.id = oi.product_id
where oi.unit_price <> p.price
order by o.created_at desc;
