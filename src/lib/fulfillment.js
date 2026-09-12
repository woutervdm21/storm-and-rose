// Collection points customers can fetch their own order from.
export const COLLECTION_POINTS = [
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
]

// The Courier Guy delivery methods. Flat fee per method — there is no
// free-delivery threshold, so every delivery order pays the courier fee.
export const DELIVERY_METHODS = [
  {
    value: 'delivery_door',
    label: 'Door-to-Door',
    short: 'Courier Guy · Door-to-Door',
    blurb: 'Delivered to your address',
    fee:   130,
    address: null,
  },
  {
    value: 'delivery_locker',
    label: 'Pudo Locker',
    short: 'Courier Guy · Pudo Locker',
    blurb: 'Collected from your nearest Pudo locker',
    fee:   80,
    address: null,
  },
]

export const FULFILLMENT_OPTIONS = [
  ...COLLECTION_POINTS,
  ...DELIVERY_METHODS,
  // legacy value, from orders placed before the two courier methods existed
  { value: 'delivery', label: 'Delivery', short: 'Delivery', fee: 100, address: null },
]

export const isDelivery = (value) => Boolean(value?.startsWith('delivery'))

// Courier fee for a stored fulfillment value — zero for collection orders
export const deliveryFeeFor = (value) =>
  FULFILLMENT_OPTIONS.find(o => o.value === value)?.fee ?? 0

export const fulfillmentInfo = (value) =>
  FULFILLMENT_OPTIONS.find(o => o.value === value) ?? FULFILLMENT_OPTIONS.at(-1)
