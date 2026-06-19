// Display helpers. Money arrives as a decimal string from the backend; we never
// do float math on it in the UI — just format for display.
export const money = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v || 0));

export const shortId = (id) => (id ? `${String(id).slice(0, 8)}…` : "—");

export const dateTime = (v) =>
  v ? new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
