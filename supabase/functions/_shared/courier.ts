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

// Pudo lockers, as Courier Guy names them. Locker services are priced by the
// compartment the parcel fits (codes D2LXS, D2LS, D2LM, D2LL…), and the API
// only offers the sizes the parcel actually fits into.
export const LOCKER_PROVIDER = 'tcg-locker'

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
  fulfillment?: string | null
  pudo_locker_id?: string | null
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

export const isLockerOrder = (order: CourierOrder) => order.fulfillment === 'delivery_locker'

// where the parcel goes: the customer's door, or the Pudo locker they chose
function destinationFor(order: CourierOrder) {
  if (isLockerOrder(order)) {
    const id = order.pudo_locker_id?.trim()
    if (!id) return { ok: false as const, reason: 'order has no Pudo locker chosen' }
    // no declared value here — Courier Guy's own plugin notes a locker quote
    // comes back empty when one is sent
    return {
      ok: true as const,
      fields: { delivery_pickup_point_id: id, delivery_pickup_point_provider: LOCKER_PROVIDER } as Record<string, unknown>,
    }
  }
  const delivery = deliveryAddressFor(order)
  if (!delivery.ok) return delivery
  return { ok: true as const, fields: { delivery_address: delivery.address } as Record<string, unknown> }
}

// body for POST /rates — a free quote
export function rateRequest(order: CourierOrder, parcelKey: string, declaredValue: number, from: string) {
  const destination = destinationFor(order)
  if (!destination.ok) return destination
  const parcel = parcelFor(parcelKey)
  if (!parcel) return { ok: false as const, reason: `unknown parcel size "${parcelKey}"` }
  const point = COLLECTION_POINTS[from]
  if (!point) return { ok: false as const, reason: `unknown collection point "${from}"` }

  return {
    ok: true as const,
    body: {
      collection_address: point.address,
      ...destination.fields,
      parcels:            [parcel],
      ...(isLockerOrder(order) ? {} : { declared_value: declaredValue }),
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

// the cheapest door-to-locker rate — the smallest compartment the parcel fits
export function pickLocker(rates: any[]) {
  return (rates ?? [])
    .filter(r => String(r?.service_level?.code ?? '').startsWith('D2L'))
    .sort((a, b) => a.rate - b.rate)[0] ?? null
}

export const pickRate = (order: CourierOrder, rates: any[]) =>
  isLockerOrder(order) ? pickLocker(rates) : pickEconomy(rates)

// --- lockers ---------------------------------------------------------------

// Courier Guy's trading hours arrive with their dashes mangled (â€“)
const MOJIBAKE: Record<string, string> = { 'â€“': '–', 'â€”': '—', 'â€™': '’', 'Â ': ' ' }
const unmangle = (s: string) => Object.entries(MOJIBAKE).reduce((out, [bad, good]) => out.split(bad).join(good), s)

export type Locker = { id: string; name: string; address: string; hours: string; lat: number | null; lng: number | null }

// the few fields a customer needs to choose a locker, skipping any that
// are offline or hidden
export function tidyLockers(points: any[], limit = 10): Locker[] {
  return (points ?? [])
    .filter(p => p?.pickup_point_provider === LOCKER_PROVIDER && p.status === 'online' && !p.is_hidden)
    .slice(0, limit)
    .map(p => {
      const a = p.address ?? {}
      // some lockers repeat the town and code inside street_address — keep each part once
      const parts = [a.street_address, a.local_area, a.city, a.code]
        .filter(Boolean)
        .flatMap((part: string) => String(part).split(',').map(x => x.trim()))
        .filter(Boolean)
      const address = parts
        .filter((part, i) => parts.findIndex(x => x.toLowerCase() === part.toLowerCase()) === i)
        .join(', ')
      return {
        id:      p.pickup_point_id,
        name:    p.name,
        address: address || a.entered_address || '',
        hours:   unmangle(p.trading_hours ?? ''),
        lat:     a.lat ?? null,
        lng:     a.lng ?? null,
      }
    })
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

// tracking for one shipment. The lookup is by reference and can return other
// accounts' parcels that share it, so callers match on our own shipment id.
export const trackShipment = (key: string, trackingRef: string) =>
  call(`/tracking/shipments?tracking_reference=${encodeURIComponent(trackingRef)}`, key)

// our shipment's current state, out of a tracking response — null if it isn't there
export function readTracking(body: any, shipmentId: number) {
  const shipment = (body?.shipments ?? []).find((s: any) => Number(s?.shipment_id) === Number(shipmentId))
  if (!shipment) return null
  const status = String(shipment.status ?? '')
  return {
    status,
    delivered:   status === 'delivered' || Boolean(shipment.shipment_delivered_date),
    deliveredAt: shipment.shipment_delivered_date ?? null,
  }
}

// lockers matching a town/suburb/street, or closest to a point
export function findLockers(key: string, where: { q?: string; lat?: number; lng?: number }) {
  const params = new URLSearchParams({ type: 'locker', order_closest: 'true' })
  if (where.q) params.set('search', where.q)
  if (where.lat != null && where.lng != null) {
    params.set('lat', String(where.lat))
    params.set('lng', String(where.lng))
  }
  return call(`/pickup-points?${params}`, key)
}
