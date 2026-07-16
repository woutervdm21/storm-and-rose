// Flat courier fee for delivery orders (average SA door-to-door small-parcel rate)
export const DELIVERY_FEE = 100

// Orders at or above this subtotal get free delivery
export const FREE_DELIVERY_THRESHOLD = 700

// Courier fee for a given cart subtotal — free once the threshold is reached
export const deliveryFeeFor = (subtotal) =>
  subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE

// Nudge shown in add-to-cart toasts — how far the cart is from free delivery
export const freeDeliveryMessage = (subtotal) =>
  subtotal >= FREE_DELIVERY_THRESHOLD
    ? '🚚 Your order qualifies for FREE delivery!'
    : `🚚 Add R ${(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(2)} more for FREE delivery`

// Fulfillment options shared by Checkout, OrderConfirmation and AdminOrders.
export const FULFILLMENT_OPTIONS = [
  {
    value: 'collection_emalahleni',
    label: 'Collection — Emalahleni',
    short: 'Collection · Emalahleni',
    address: ['4 Judith Street', 'Del Judor Ext 4, Emalahleni'],
  },
  {
    value: 'collection_middelburg',
    label: 'Collection — Middelburg',
    short: 'Collection · Middelburg',
    address: ['23 Seinheuwel Crescent, Pebble Creek Unit 2', 'Aerorand, Middelburg'],
  },
  {
    value: 'delivery',
    label: 'Delivery',
    short: 'Delivery',
    address: null,
  },
]

export const fulfillmentInfo = (value) =>
  FULFILLMENT_OPTIONS.find(o => o.value === value) ?? FULFILLMENT_OPTIONS[2]
