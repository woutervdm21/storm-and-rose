// Order confirmation page.
//
// Reached two ways:
//   1. straight from checkout, with the order in router state (EFT, or a card
//      payment that could not be started) — shows the EFT banking details
//   2. back from Yoco, as a fresh page load with ?order=…&payment=…  — router
//      state is gone, so the order id in the query string is all we have
//
// In case 2 the `payment` parameter says what Yoco *redirected* with, which
// anyone could type. It decides the wording, nothing more. Whether the order
// is actually paid comes from the order-status function, which reads the row
// the webhook writes.
import { useEffect, useState } from 'react'
import { useLocation, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Meta from '../components/Meta'
import { fulfillmentInfo } from '../lib/fulfillment'

// EFT banking details
const EFT = {
  bank:      'Standard Bank',
  name:      'Storm and Rose',
  type:      'Savings',
  account:   '133422836',
  branch:    '051001',
  reference: 'Order #',
}

// The webhook usually lands before the customer's browser gets back, but not
// always. Poll briefly rather than claiming either outcome too early.
const POLL_INTERVAL_MS = 2000
const POLL_ATTEMPTS    = 6

export default function OrderConfirmation() {
  const { state } = useLocation()
  const [params]  = useSearchParams()

  const stateOrder = state?.order
  const orderId    = stateOrder?.id ?? params.get('order')
  const outcome    = params.get('payment')          // success | cancelled | failed

  const [status, setStatus]     = useState(null)
  const [checking, setChecking] = useState(outcome === 'success')
  const [retrying, setRetrying] = useState(false)
  const [total, setTotal]       = useState(state?.total ?? null)

  // only a card return needs the status — the EFT flow knows it is unpaid
  useEffect(() => {
    if (!orderId || !outcome) return

    let cancelled = false
    let attempts  = 0

    async function poll() {
      const { data } = await supabase.functions.invoke('order-status', {
        body: { order_id: orderId },
      })
      if (cancelled) return

      if (data?.status) setStatus(data.status)
      if (data?.amount_cents != null) setTotal(data.amount_cents / 100)

      // settled, or we have waited long enough to stop pretending
      if (data?.status && data.status !== 'pending_payment') { setChecking(false); return }
      if (++attempts >= POLL_ATTEMPTS || outcome !== 'success') { setChecking(false); return }

      setTimeout(poll, POLL_INTERVAL_MS)
    }

    poll()
    return () => { cancelled = true }
  }, [orderId, outcome])

  async function retryPayment() {
    setRetrying(true)
    const { data, error } = await supabase.functions.invoke('yoco-create-checkout', {
      body: { order_id: orderId },
    })
    if (data?.redirectUrl) {
      window.location.href = data.redirectUrl
      return
    }
    console.error('Could not restart Yoco checkout', error, data)
    setRetrying(false)
  }

  if (!orderId) {
    return (
      <main className="max-w-lg mx-auto px-4 py-12 text-center">
        <p>No order found. <Link to="/" className="text-rose-mid hover:underline">Go home</Link></p>
      </main>
    )
  }

  const reference = String(orderId).slice(0, 8).toUpperCase()
  const paid      = status === 'paid' || status === 'shipped'
  const cardFlow  = Boolean(outcome)

  return (
    <main className="max-w-lg mx-auto px-4 py-12">
      <Meta title="Order Confirmed" noIndex />

      {cardFlow ? (
        <CardOutcome
          outcome={outcome}
          paid={paid}
          checking={checking}
          reference={reference}
          total={total}
          retrying={retrying}
          onRetry={retryPayment}
        />
      ) : (
        <>
          <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust mb-2">Thank You!</h1>
          <p className="mb-3">Your order has been placed. Please complete payment via EFT.</p>
          <p className="mb-8 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/30 rounded-lg px-4 py-2">
            ⚠ Please note — shipments will only be processed once payment has reflected in our account.
          </p>
        </>
      )}

      {/* EFT details — hidden once a card payment has actually gone through */}
      {!paid && (
        <div className="bg-rose-dust/10 border border-rose-dust/30 rounded-xl p-6 space-y-3">
          <h2 className="font-serif text-xl mb-4">EFT Payment Details</h2>
          <DetailRow label="Bank"         value={EFT.bank} />
          <DetailRow label="Account Name" value={EFT.name} />
          <DetailRow label="Account Type" value={EFT.type} />
          <DetailRow label="Account No."  value={EFT.account} />
          <DetailRow label="Branch Code"  value={EFT.branch} />
          <DetailRow label="Reference"    value={`${EFT.reference}${reference}`} />
          {total != null && <DetailRow label="Amount" value={`R ${Number(total).toFixed(2)}`} />}
        </div>
      )}

      {/* fulfillment summary — only the checkout hand-off knows the address */}
      {stateOrder && (
        <div className="mt-6 text-sm">
          {stateOrder.fulfillment?.startsWith('collection') ? (
            <>
              <p className="font-semibold mb-1">Collect your order from:</p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {fulfillmentInfo(stateOrder.fulfillment).address.map(line => <span key={line}>{line}<br /></span>)}
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                We'll contact you when your order is ready for collection.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold mb-1">Delivery to:</p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {stateOrder.shipping_line1}{stateOrder.shipping_line2 ? `, ${stateOrder.shipping_line2}` : ''}<br />
                {stateOrder.shipping_city}, {stateOrder.shipping_province}, {stateOrder.shipping_postal}
              </p>
            </>
          )}
        </div>
      )}

      {stateOrder && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Once payment reflects, we will update your order status and contact you at{' '}
          <strong>{stateOrder.customer_email || stateOrder.customer_phone}</strong>.
        </p>
      )}

      <Link to="/" className="inline-block mt-8 text-rose-mid hover:underline">
        Continue shopping
      </Link>
    </main>
  )
}

function CardOutcome({ outcome, paid, checking, reference, total, retrying, onRetry }) {
  if (checking) {
    return (
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust mb-2">Confirming your payment…</h1>
        <p className="text-gray-600 dark:text-gray-400">
          This takes a few seconds. Your reference is <strong>#{reference}</strong>.
        </p>
      </div>
    )
  }

  if (paid) {
    return (
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust mb-2">Payment received</h1>
        <p className="mb-3">
          Thank you! Your order <strong>#{reference}</strong>
          {total != null && <> for <strong>R {Number(total).toFixed(2)}</strong></>} is paid and we are
          getting it ready.
        </p>
        <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 border border-emerald-200 dark:border-emerald-400/30 rounded-lg px-4 py-2">
          ✓ Nothing further is needed from you — we'll be in touch about collection or delivery.
        </p>
      </div>
    )
  }

  // Either the customer backed out, the card was declined, or the payment went
  // through but the webhook has not reached us yet. We cannot tell which from
  // here, so the wording promises nothing and offers a way forward.
  const backedOut = outcome === 'cancelled'

  return (
    <div className="mb-8">
      <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust mb-2">
        {backedOut ? 'Payment cancelled' : 'Payment not confirmed'}
      </h1>
      <p className="mb-4">
        Your order <strong>#{reference}</strong> is saved, but we have not received payment for it yet.
        {!backedOut && ' If money has left your account it will reach us shortly and we will pick it up — please do not pay twice.'}
      </p>
      <button onClick={onRetry} disabled={retrying} className="btn-primary py-3 px-6">
        {retrying ? 'Starting…' : 'Try card payment again'}
      </button>
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Or pay by EFT using the details below.</p>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="font-semibold">{label}</span>
      <span>{value}</span>
    </div>
  )
}
