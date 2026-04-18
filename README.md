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
| Hosting | Netlify (static deploy) |

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

## Deployment (Netlify)

1. Push to GitHub
2. Connect repo in Netlify → **New site from Git**
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables in Netlify → Site Settings → Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Add your custom domain under Domain Management

> Every push to `main` triggers an automatic redeploy.

---

## Before Going Live

- [ ] Update EFT banking details in `src/pages/OrderConfirmation.jsx`
- [ ] Update `SITE_URL` in `src/components/Meta.jsx` to your actual domain
- [ ] Update `sitemap.xml` in `public/` with live product URLs
- [ ] Set your site URL in Supabase → Authentication → URL Configuration
