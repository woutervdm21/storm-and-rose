// The Courier Guy (ShipLogic) — request builders and API calls.
//
// Field names follow Courier Guy's own WooCommerce plugin
// (plugins.svn.wordpress.org/the-courier-guy, Core/TCG_Plugin.php), which
// talks to the same API. ShipLogic's docs are private, so that plugin is the
// reference.
//
// There is no test environment: the API key is live, and createShipment()
// books a real, billed collection. Quotes, labels and look-ups are free.
// The builders are pure, so scripts/test-courier.mjs checks them without
// touching the network.

export const API_BASE = 'https://api.portal.thecourierguy.co.za/v2'

// customers follow their parcel here with the short tracking reference
export const trackingUrl = (ref: string) =>
  `https://portal.thecourierguy.co.za/track?ref=${encodeURIComponent(ref)}`

// Where the courier can collect from — the admin picks one per booking.
// Mirrors the collection points in src/lib/fulfillment.js. Each has its own
// contact, set as COURIER_CONTACT_<KEY>_NAME / _PHONE (see courier/index.ts).
export const COLLECTION_POINTS: Record<string, { label: string; address: Record<string, string> }> = {
  emalahleni: {
    label: 'Emalahleni',
    address: {
      type:           'residential',
      company:        'Storm & Rose',
      street_address: '4 Judith Street',
      local_area:     'Del Judor Ext 4',
      city:           'Emalahleni',
      zone:           'Mpumalanga',
      country:        'ZA',
      code:           '1035',
    },
  },
  middelburg: {
    label: 'Middelburg',
    address: {
      type:           'residential',
      company:        'Storm & Rose',
      street_address: '23 Seinheuwel Crescent, Pebble Creek Unit 2',
      local_area:     'Aerorand',
      city:           'Middelburg',
      zone:           'Mpumalanga',
      country:        'ZA',
      code:           '1050',
    },
  },
}
export const DEFAULT_COLLECTION = 'emalahleni'

// Box presets the admin picks from when booking. Mirrors src/lib/courier.js.
export const PARCELS: Record<string, { label: string; length: number; width: number; height: number; kg: number }> = {
  small:  { label: 'Small',  length: 15, width: 10, height: 10, kg: 0.8 },
  medium: { label: 'Medium', length: 25, width: 20, height: 15, kg: 2 },
  large:  { label: 'Large',  length: 40, width: 30, height: 20, kg: 5 },
}
export const DEFAULT_PARCEL = 'small'

// only Economy is used — the cheapest service, and the one the fee is based on
export const SERVICE_CODES = ['ECO', 'ECOR']

export type CourierOrder = {
  id: string
  customer_name: string
  customer_email?: string | null
  customer_phone?: string | null
  shipping_line1?: string | null
  shipping_line2?: string | null
  shipping_city?: string | null
  shipping_province?: string | null
  shipping_postal?: string | null
}

export type Contact = { name: string; mobile_number: string; email: string }

// the customer's address in ShipLogic's shape, or the reason it can't be used
export function deliveryAddressFor(order: CourierOrder) {
  const missing = [
    !order.shipping_line1?.trim()    && 'street address',
    !order.shipping_city?.trim()     && 'city',
    !order.shipping_province?.trim() && 'province',
    !order.shipping_postal?.trim()   && 'postal code',
  ].filter(Boolean)
  if (missing.length) return { ok: false as const, reason: `order is missing ${missing.join(', ')}` }

  return {
    ok: true as const,
    address: {
      type:           'residential',
      street_address: order.shipping_line1!.trim(),
      local_area:     order.shipping_line2?.trim() ?? '',
      city:           order.shipping_city!.trim(),
      zone:           order.shipping_province!.trim(),
      country:        'ZA',
      code:           order.shipping_postal!.trim(),
    },
  }
}

// one parcel in ShipLogic's shape
export function parcelFor(key: string) {
  const p = PARCELS[key]
  if (!p) return null
  return {
    submitted_length_cm: p.length,
    submitted_width_cm:  p.width,
    submitted_height_cm: p.height,
    submitted_weight_kg: p.kg,
  }
}

// body for POST /rates — a free quote
export function rateRequest(order: CourierOrder, parcelKey: string, declaredValue: number, from: string) {
  const delivery = deliveryAddressFor(order)
  if (!delivery.ok) return delivery
  const parcel = parcelFor(parcelKey)
  if (!parcel) return { ok: false as const, reason: `unknown parcel size "${parcelKey}"` }
  const point = COLLECTION_POINTS[from]
  if (!point) return { ok: false as const, reason: `unknown collection point "${from}"` }

  return {
    ok: true as const,
    body: {
      collection_address: point.address,
      delivery_address:   delivery.address,
      parcels:            [parcel],
      declared_value:     declaredValue,
    },
  }
}

// body for POST /shipments — books a real collection
export function shipmentRequest(
  order: CourierOrder,
  parcelKey: string,
  declaredValue: number,
  from: string,
  serviceLevelId: number,
  shop: Contact,
) {
  const rate = rateRequest(order, parcelKey, declaredValue, from)
  if (!rate.ok) return rate
  if (!order.customer_phone?.trim()) return { ok: false as const, reason: 'order has no phone number for the courier' }

  const reference = String(order.id).slice(0, 8).toUpperCase()

  return {
    ok: true as const,
    body: {
      ...rate.body,
      parcels: rate.body.parcels.map(p => ({ ...p, submitted_description: `Order #${reference}`, packaging: `Order #${reference}` })),
      service_level_id:   serviceLevelId,
      collection_contact: shop,
      delivery_contact: {
        name:          order.customer_name,
        mobile_number: order.customer_phone.trim(),
        email:         order.customer_email ?? '',
      },
      special_instructions_collection: '',
      special_instructions_delivery:   '',
      customer_reference:              `#${reference}`,
    },
  }
}

// the cheapest Economy rate out of a /rates response
export function pickEconomy(rates: any[]) {
  return (rates ?? [])
    .filter(r => SERVICE_CODES.includes(r?.service_level?.code))
    .sort((a, b) => a.rate - b.rate)[0] ?? null
}

// --- network ---------------------------------------------------------------

async function call(path: string, key: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', ...init.headers },
  })
  const text = await res.text()
  let body: any = text
  try { body = JSON.parse(text) } catch { /* plain-text error */ }
  return { ok: res.ok, status: res.status, body }
}

export const getRates     = (key: string, body: unknown) => call('/rates', key, { method: 'POST', body: JSON.stringify(body) })
export const createShipment = (key: string, body: unknown) => call('/shipments', key, { method: 'POST', body: JSON.stringify(body) })
export const getLabel     = (key: string, shipmentId: number) => call(`/shipments/label?id=${shipmentId}`, key)
