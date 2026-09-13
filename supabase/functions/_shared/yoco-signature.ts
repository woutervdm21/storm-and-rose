// Verifies that a webhook really came from Yoco.
//
// Kept apart from the function that uses it, and given its secret rather than
// reading one, so it can be run against known-good and deliberately broken
// inputs without a deployment. See scripts/test-yoco-signature.mjs.
//
// The scheme: sign `${webhook-id}.${webhook-timestamp}.${raw body}` with
// HMAC-SHA256, keyed by the base64-decoded secret minus its `whsec_` prefix,
// and base64 the result.

// Yoco retries a failed delivery, and a replayed old event must not be
// accepted, so anything older than this is refused.
export const TOLERANCE_SECONDS = 3 * 60

export type VerifyInput = {
  id: string | null
  timestamp: string | null
  signatureHeader: string | null
  body: string
  secret: string | undefined
  now?: number          // seconds since epoch; injectable so tests can pin it
}

export type VerifyResult = { ok: boolean; reason?: string }

// compare without leaking how many bytes matched
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

const b64decode = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const b64encode = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)))

export async function sign(signedContent: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    b64decode(secret.replace(/^whsec_/, '')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return b64encode(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent)))
}

export async function verifyWebhookSignature(input: VerifyInput): Promise<VerifyResult> {
  const { id, timestamp, signatureHeader, body, secret } = input

  if (!secret) return { ok: false, reason: 'no signing secret configured' }
  if (!id || !timestamp || !signatureHeader) return { ok: false, reason: 'missing webhook headers' }

  const now = input.now ?? Math.floor(Date.now() / 1000)
  const age = Math.abs(now - Number(timestamp))
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) {
    return { ok: false, reason: `timestamp outside tolerance (${timestamp})` }
  }

  // the raw body, byte for byte — re-serialising parsed JSON changes the hash
  const expected = await sign(`${id}.${timestamp}.${body}`, secret)

  // the header looks like "v1,<signature>", and may carry several
  // space-separated signatures while a secret is being rotated — any one
  // matching is enough
  const encoder = new TextEncoder()
  const matched = signatureHeader.split(' ').some((part) => {
    const sig = part.includes(',') ? part.slice(part.indexOf(',') + 1) : part
    return timingSafeEqual(encoder.encode(sig), encoder.encode(expected))
  })

  return matched ? { ok: true } : { ok: false, reason: 'signature mismatch' }
}
