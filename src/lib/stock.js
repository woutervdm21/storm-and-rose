// Shared stock thresholds so the Stock and Analytics pages agree on "low"
export const LOW_STOCK = 3

// 'out' | 'low' | 'ok' for a product's stock count
export function stockLevel(stock) {
  if (!stock || stock <= 0) return 'out'
  if (stock <= LOW_STOCK) return 'low'
  return 'ok'
}
