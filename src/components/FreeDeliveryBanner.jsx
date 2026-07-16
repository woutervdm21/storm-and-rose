// Free-delivery banner — nudges the customer toward the free-delivery threshold
import { useCart } from '../context/CartContext'
import { FREE_DELIVERY_THRESHOLD } from '../lib/fulfillment'

export default function FreeDeliveryBanner() {
  const { total } = useCart()
  const remaining = FREE_DELIVERY_THRESHOLD - total
  const progress = Math.min((total / FREE_DELIVERY_THRESHOLD) * 100, 100)

  return (
    <div className="rounded-xl border border-rose-dust/30 bg-rose-dust/10 px-4 py-3 text-sm">
      {remaining > 0 ? (
        <>
          <p className="flex items-center gap-2.5">
            <span className="text-xl" aria-hidden="true">🚚</span>
            <span>
              Add <strong className="text-rose-deep dark:text-rose-dust">R {remaining.toFixed(2)}</strong> more
              to qualify for <strong className="text-rose-deep dark:text-rose-dust">FREE delivery</strong>
            </span>
          </p>
          {/* progress toward the free-delivery threshold */}
          <div className="mt-2.5 h-1.5 rounded-full bg-rose-dust/25 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-mid to-rose-deep transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      ) : (
        <p className="flex items-center gap-2.5 font-semibold text-rose-deep dark:text-rose-dust">
          <span className="text-xl" aria-hidden="true">🚚</span>
          <span>Your order qualifies for FREE delivery! 🎉</span>
        </p>
      )}
    </div>
  )
}
