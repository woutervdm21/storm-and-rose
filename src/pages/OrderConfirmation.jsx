// Order confirmation page — shown after successful checkout, displays EFT payment instructions
import { useLocation, Link } from 'react-router-dom'
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

export default function OrderConfirmation() {
  const { state } = useLocation()
  const order = state?.order
  const total = state?.total

  if (!order) {
    return (
      <main className="max-w-lg mx-auto px-4 py-12 text-center">
        <p>No order found. <Link to="/" className="text-rose-mid hover:underline">Go home</Link></p>
      </main>
    )
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-12">
      <Meta title="Order Confirmed" noIndex />
      <h1 className="font-serif text-3xl text-rose-deep dark:text-rose-dust mb-2">Thank You!</h1>
      <p className="mb-3">Your order has been placed. Please complete payment via EFT.</p>
      <p className="mb-8 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/30 rounded-lg px-4 py-2">
        ⚠ Please note — shipments will only be processed once payment has reflected in our account.
      </p>

      {/* EFT payment details */}
      <div className="bg-rose-dust/10 border border-rose-dust/30 rounded-xl p-6 space-y-3">
        <h2 className="font-serif text-xl mb-4">EFT Payment Details</h2>
        <DetailRow label="Bank"       value={EFT.bank} />
        <DetailRow label="Account Name" value={EFT.name} />
        <DetailRow label="Account Type" value={EFT.type} />
        <DetailRow label="Account No." value={EFT.account} />
        <DetailRow label="Branch Code" value={EFT.branch} />
        <DetailRow label="Reference"  value={`${EFT.reference}${order.id.slice(0, 8).toUpperCase()}`} />
        <DetailRow label="Amount"     value={`R ${Number(total).toFixed(2)}`} />
      </div>

      {/* fulfillment summary — collection point or delivery address */}
      <div className="mt-6 text-sm">
        {order.fulfillment?.startsWith('collection') ? (
          <>
            <p className="font-semibold mb-1">Collect your order from:</p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {fulfillmentInfo(order.fulfillment).address.map(line => <span key={line}>{line}<br /></span>)}
            </p>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              We'll contact you when your order is ready for collection.
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold mb-1">Delivery to:</p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {order.shipping_line1}{order.shipping_line2 ? `, ${order.shipping_line2}` : ''}<br />
              {order.shipping_city}, {order.shipping_province}, {order.shipping_postal}
            </p>
          </>
        )}
      </div>

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Once payment reflects, we will update your order status and contact you at <strong>{order.customer_email || order.customer_phone}</strong>.
      </p>

      <Link to="/" className="inline-block mt-8 text-rose-mid hover:underline">
        Continue shopping
      </Link>
    </main>
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