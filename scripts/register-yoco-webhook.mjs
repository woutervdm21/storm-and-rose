// Registers (or lists) the Yoco webhook that tells us an order was paid.
//
// Run once per Yoco mode — the test key registers the test webhook, the live
// key the live one. The secret comes back exactly once, in the response; if
// it is lost the webhook has to be deleted and registered again.
//
//   node scripts/register-yoco-webhook.mjs list
//   node scripts/register-yoco-webhook.mjs register <functions-url>/yoco-webhook
//   node scripts/register-yoco-webhook.mjs delete <subscription-id>
//
// Registering twice leaves two subscriptions on the same url, each with its
// own secret, and only one of them can be the one in YOCO_WEBHOOK_SECRET —
// the other's deliveries fail the signature check. Yoco has no screen for
// this, so `delete` is how a duplicate goes away.
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

// `url` is the subscription id here — same slot, different meaning
if (command === 'delete') {
  if (!url) {
    console.error('Usage: register-yoco-webhook.mjs delete <subscription-id>')
    process.exit(1)
  }
  const res = await fetch(`${API}/${url}`, { method: 'DELETE', headers })
  const text = await res.text()
  console.log(res.status, text || '(no body)')
  if (res.ok) console.log(`
Deleted ${url}. Run \`list\` to confirm what is left.`)
  process.exit(res.ok ? 0 : 1)
}

if (command !== 'register' || !url) {
  console.error('Usage: register-yoco-webhook.mjs list | register <url> | delete <id>')
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
