// Stock-level + order-status classification shared across the app.

export const LOW_STOCK_DEFAULT = 10;

export function stockStatus(qty, threshold = LOW_STOCK_DEFAULT) {
  if (qty <= 0) return { key: "out", label: "Out of stock", tone: "rose" };
  if (qty < threshold) return { key: "low", label: "Low stock", tone: "amber" };
  return { key: "in", label: "In stock", tone: "emerald" };
}

export const orderStatusMeta = {
  PLACED: { label: "Placed", tone: "emerald" },
  CANCELLED: { label: "Cancelled", tone: "slate" },
};

// Tailwind class sets per semantic tone (badges, dots, bars).
export const TONES = {
  emerald: { badge: "bg-stock-50 text-stock-700", dot: "bg-stock-500", bar: "bg-stock-500" },
  amber: { badge: "bg-amber-50 text-amber-700", dot: "bg-amber-500", bar: "bg-amber-500" },
  rose: { badge: "bg-rose-50 text-rose-700", dot: "bg-rose-500", bar: "bg-rose-500" },
  slate: { badge: "bg-brand-100 text-brand-600", dot: "bg-brand-400", bar: "bg-brand-400" },
  indigo: { badge: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500", bar: "bg-indigo-500" },
};
