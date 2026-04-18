# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Storm & Rose — luxury candle store MVP ("A Storm of Faith venture"). Customers browse products, add to cart, and place orders paid via EFT. Admins manage products and order statuses.

Tagline: *Luxury Candles & Thoughtful Designs, Handcrafted with Love*

## Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage) — no custom server
- **Hosting**: Custom domain (static frontend deploy)

## Commands

```bash
npm run dev       # start Vite dev server
npm run build     # production build
npm run preview   # preview production build locally
```

## Brand & Design

### Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-rose-dust` | `#C4788A` | Primary accent, backgrounds |
| `--color-rose-deep` | `#8B2E4A` | Headings, borders, hover states |
| `--color-rose-mid` | `#B5607A` | Dividers, secondary accents |
| `--color-navy` | `#1A1A2E` | Dark backgrounds, footer |
| `--color-cream` | `#F5F3F1` | Page background, card surfaces |

### Brand Assets (`/images/`)
- `Logo1.jpg` — circular stamp logo, mauve fill (use on dark or cream backgrounds)
- `Logo2.jpg` — circular stamp logo, transparent/light (use on dark backgrounds)
- `BusinessCard.jpg` — reference for layout style: dark navy + cream split with rose wave
- `Card.jpg` — "Storm of Faith" parent brand card (reference only, don't use directly)

### Design Tone
Elegant, warm, minimal. Serif or mixed serif/sans typography. Soft shadows, rounded corners. No harsh or overly modern aesthetics — match the handcrafted luxury feel of the brand.

## Architecture

```
src/
  pages/          # Route-level components
  components/     # Reusable UI pieces
  lib/
    supabase.js   # Supabase client — single shared instance, import everywhere
  context/
    CartContext.jsx  # Cart state via React Context + localStorage
```

### Key Patterns

- **Supabase client** lives in `src/lib/supabase.js` — never instantiate it twice.
- **Cart** is React Context backed by `localStorage`. No external state library.
- **Auth**: Supabase Auth (email/password). Admin routes check authenticated session + `admin` role.
- **Images**: stored in Supabase Storage; URL stored on the product row.
- **Payments**: manual EFT only. Orders created with `pending_payment`; admin updates to `paid` or `shipped`.

### Database Tables

| Table | Key columns |
|-------|-------------|
| `products` | id, name, description, price, image_url, stock |
| `orders` | id, customer_name, customer_email, status, created_at |
| `order_items` | id, order_id, product_id, quantity, unit_price |

Order status flow: `pending_payment` → `paid` → `shipped`

## Dark Mode

Tailwind `darkMode: 'class'` strategy. The `dark` class is toggled on `<html>` by `ThemeContext`. Always pair light/dark variants: `bg-cream dark:bg-navy`, `text-navy dark:text-cream`, etc. User preference is persisted in `localStorage`.

Shared component classes (`input-field`, `btn-primary`, `btn-secondary`) are defined in `src/index.css` under `@layer components`.

## Code Style

- Add brief comments to explain **what a block does** — one line per logical section (e.g., `// fetch products`, `// guard: admin only`). Not every line, not multi-paragraph blocks.
- Comments should help a non-expert reader follow the flow without explanation from a developer.

## Principles

- Build only what the current feature needs — no speculative abstractions.
- No global state libraries (Zustand, Redux, etc.).
- No custom API layer — use the Supabase client directly in components/hooks.
- No real-time subscriptions, background workers, or payment gateways.
- Prefer plain React state and context over any additional tooling.
