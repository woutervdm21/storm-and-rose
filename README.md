# Storm & Rose

> Luxury Candles & Thoughtful Designs, Handcrafted with Love — *A Storm of Faith venture*

E-commerce web app for the Storm & Rose candle store. Customers can browse products, add to cart, and place orders paid via EFT. Admins manage products and order statuses.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Hosting | Cloudflare Workers (static assets) |
| DNS | Cloudflare — domain registered at domains.co.za |
| Email | Resend, via a Supabase Edge Function |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env` and fill in your Supabase credentials (found in Supabase Dashboard → Project Settings → API):

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run locally

```bash
npm run dev
```

Open `http://localhost:5173`

---

## Supabase Setup

### Database tables

```sql
create table products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  price       numeric(10,2) not null,
  image_url   text,
  stock       integer not null default 0,
  created_at  timestamptz default now()
);

create table orders (
  id               uuid primary key default gen_random_uuid(),
  customer_name    text not null,
  customer_email   text not null,
  customer_phone   text,
  status           text not null default 'pending_payment'
                     check (status in ('pending_payment','paid','shipped')),
  shipping_line1   text,
  shipping_line2   text,
  shipping_city    text,
  shipping_province text,
  shipping_postal  text,
  fulfillment      text not null default 'delivery'
                     check (fulfillment in ('collection_emalahleni','collection_middelburg','delivery')),
  created_at       timestamptz default now()
);

create table order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  quantity   integer not null,
  unit_price numeric(10,2) not null
);

create index on order_items(order_id);

-- Multiple images per product. products.image_url is kept in sync with the
-- first image (sort_order 0) and acts as the cover/thumbnail everywhere else.
create table product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url        text not null,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

create index on product_images(product_id);

alter table product_images enable row level security;

create policy "public read product_images"
  on product_images for select to public using (true);

create policy "admin insert product_images"
  on product_images for insert to authenticated with check (true);

create policy "admin update product_images"
  on product_images for update to authenticated using (true);

create policy "admin delete product_images"
  on product_images for delete to authenticated using (true);

-- One-time migration of existing single images into the new table
insert into product_images (product_id, url, sort_order)
select id, image_url, 0 from products where image_url is not null;
```

### Storage

Create a public bucket named `product-images` and add these policies via SQL Editor:

```sql
create policy "admin upload product-images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images');

create policy "admin update product-images"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images');

create policy "admin delete product-images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images');

create policy "public read product-images"
  on storage.objects for select to public
  using (bucket_id = 'product-images');
```

### Admin user

Create an admin account in Supabase Dashboard → Authentication → Users.

---

## Project Structure

```
src/
  pages/
    Storefront.jsx          # Product grid + hero
    ProductDetail.jsx       # Single product with quantity selector
    Cart.jsx                # Cart with quantity controls
    Checkout.jsx            # Contact, address, order creation
    OrderConfirmation.jsx   # EFT payment instructions
    NotFound.jsx            # 404
    admin/
      AdminLogin.jsx        # Supabase auth login
      AdminLayout.jsx       # Shared admin nav (Products / Orders)
      AdminProducts.jsx     # CRUD + image upload
      AdminOrders.jsx       # Status updates + stock deduction
  components/
    Navbar.jsx              # Logo, cart badge, dark/light toggle
    Footer.jsx              # Contact details, quick links
    ProductCard.jsx         # Card used in storefront grid
    AdminGuard.jsx          # Redirects unauthenticated users
    Meta.jsx                # SEO head tags (react-helmet-async)
  context/
    CartContext.jsx         # Cart state — persisted to localStorage
    ThemeContext.jsx        # Dark/light mode — persisted to localStorage
  lib/
    supabase.js             # Shared Supabase client
```

---

## Deployment (Cloudflare)

The site deploys to Cloudflare Workers as a static-assets project. There is
no Worker script — `wrangler.jsonc` points Cloudflare at the built `dist`
output, with `not_found_handling: "single-page-application"` so React Router
routes like `/cart` and `/admin/orders` survive a direct load or refresh.

1. Push to GitHub (`woutervdm21/storm-and-rose`)
2. Cloudflare dashboard → **Workers & Pages** → connect the repo
3. Build settings:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
4. Add environment variables in the project's build settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   Vite inlines these at **build** time, so a build without them succeeds and
   then fails at runtime with no data. The anon key is public by design —
   row-level security is what protects the data.
5. Attach the custom domain under **Custom domains**. Cloudflare writes the
   DNS records itself, so do not add A or CNAME records by hand.

> Every push to `main` triggers an automatic redeploy.

### DNS

`stormandrose.co.za` is registered at domains.co.za with DNS delegated to
Cloudflare — the nameservers at the registrar must point at the pair shown on
the zone's Overview page.

### Order notification email

`supabase/functions/order-notification/` emails the shop when an order is
placed, triggered by `on_order_created` on the `orders` table. See that
folder's README for the secrets and deploy steps.

---

## Before Going Live

- [ ] Update EFT banking details in `src/pages/OrderConfirmation.jsx`
- [ ] Update `sitemap.xml` in `public/` with live product URLs
- [ ] Set your site URL in Supabase → Authentication → URL Configuration
- [ ] Point the registrar's nameservers at Cloudflare and wait for the zone
      to go Active
- [ ] Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the Cloudflare
      build settings
- [ ] Set `RESEND_API_KEY` so order notification emails actually send

`SITE_URL` in `src/components/Meta.jsx` is already `https://stormandrose.co.za`.
