-- Colour / style variants, built on the photos a product already has.
-- A product_image with a label becomes a selectable option on the product
-- page; images left unlabelled stay plain gallery photos.
alter table product_images add column if not exists label text;

-- What the customer actually chose, recorded on the line item so the
-- order says "Whispering Blooms — Purple" rather than just the product.
alter table order_items add column if not exists variant text;
