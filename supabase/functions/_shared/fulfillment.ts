// Fulfillment methods and their courier fees, for the Deno functions.
//
// Kept in step with src/lib/fulfillment.js — the functions cannot import from
// the Vite app. Change both when a fee changes. Every function that touches
// money imports from here, so at least the server side has one copy.

export const FULFILLMENT: Record<string, { label: string; fee: number }> = {
  collection_emalahleni: { label: 'Collection · Emalahleni',     fee: 0   },
  collection_middelburg: { label: 'Collection · Middelburg',     fee: 0   },
  delivery_door:         { label: 'Courier Guy · Door-to-Door',  fee: 130 },
  delivery_locker:       { label: 'Courier Guy · Pudo Locker',   fee: 80  },
  // legacy value, from orders placed before the two courier methods existed
  delivery:              { label: 'Delivery',                    fee: 100 },
}

export const fulfillmentFor = (value: string) =>
  FULFILLMENT[value] ?? { label: value, fee: 0 }
