// Regenerates public/sitemap.xml with a URL for every product, so Google can
// find product pages without having to crawl its way to them.
//
// Runs automatically before `npm run build` (the "prebuild" script), which
// means Cloudflare regenerates it on every deploy and it stays in step with
// the catalogue. A failure here must never fail the build — the previous
// sitemap is left in place and the deploy carries on.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const SITE_URL = 'https://stormandrose.co.za'
const OUT      = 'public/sitemap.xml'

// Cloudflare provides these as build env vars; locally they live in .env,
// which Node does not read on its own.
function env(name) {
  if (process.env[name]) return process.env[name]
  if (!existsSync('.env')) return undefined
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const i = line.indexOf('=')
    if (i > 0 && line.slice(0, i).trim() === name) return line.slice(i + 1).trim()
  }
}

const url = env('VITE_SUPABASE_URL')
const key = env('VITE_SUPABASE_ANON_KEY')

const entry = (loc, { lastmod, changefreq = 'weekly', priority = '0.8' } = {}) => `  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`

try {
  if (!url || !key) throw new Error('Supabase env vars not set')

  const res = await fetch(
    `${url}/rest/v1/products?select=id,created_at&order=created_at.desc`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  )
  if (!res.ok) throw new Error(`Supabase responded ${res.status}`)

  const products = await res.json()

  const urls = [
    entry(`${SITE_URL}/`, { changefreq: 'weekly', priority: '1.0' }),
    ...products.map(p => entry(`${SITE_URL}/products/${p.id}`, {
      lastmod: p.created_at?.slice(0, 10),
    })),
  ]

  // cart, checkout and admin are deliberately absent — robots.txt disallows them

  writeFileSync(OUT, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`)
  console.log(`sitemap: wrote ${urls.length} urls (1 page + ${products.length} products)`)
} catch (err) {
  console.warn(`sitemap: skipped — ${err.message}. Keeping the existing ${OUT}.`)
}
