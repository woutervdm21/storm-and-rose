// Registers (or lists) the Yoco webhook that tells us an order was paid.
//
// Run once per Yoco mode — the test key registers the test webhook, the live
// key the live one. The secret comes back exactly once, in the response; if
// it is lost the webhook has to be deleted and registered again.
//
//   node scripts/register-yoco-webhook.mjs list
//   node scripts/register-yoco-webhook.mjs register <functions-url>/yoco-webhook
//
// Reads the key from YOCO_SECRET_KEY:
//   PowerShell:  $env:YOCO_SECRET_KEY = 'sk_test_...'
//
// Then store the printed whsec_… secret where the function can read it:
//   npx supabase secrets set --project-ref enpyghydpklvuhaicwrr YOCO_WEBHOOK_SECRET=whsec_...

const API = 'https://payments.yoco.com/api/webhooks'

const key = process.env.YOCO_SECRET_KEY
if (!key) {
  console.error('Set YOCO_SECRET_KEY first (use the sk_test_ key while testing).')
  process.exit(1)
}

const [command, url] = process.argv.slice(2)

const headers = {
  'Authorization': `Bearer ${key}`,
  'Content-Type':  'application/json',
}

if (command === 'list') {
  const res = await fetch(API, { headers })
  console.log(res.status, JSON.stringify(await res.json(), null, 2))
  process.exit(res.ok ? 0 : 1)
}

if (command !== 'register' || !url) {
  console.error('Usage: register-yoco-webhook.mjs list | register <url>')
  process.exit(1)
}

if (!url.startsWith('https://')) {
  console.error('The webhook url must be https.')
  process.exit(1)
}

const res = await fetch(API, {
  method: 'POST',
  headers,
  body: JSON.stringify({ name: 'storm-and-rose-orders', url }),
})

const body = await res.json()
console.log(res.status, JSON.stringify(body, null, 2))

if (body?.secret) {
  console.log('\nSave this now — it is only shown once:\n')
  console.log(`  npx supabase secrets set --project-ref enpyghydpklvuhaicwrr YOCO_WEBHOOK_SECRET=${body.secret}\n`)
}

process.exit(res.ok ? 0 : 1)
