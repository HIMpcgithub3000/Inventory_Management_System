import { useMemo, useState } from "react";
import {
  useOrders,
  useOrder,
  useCreateOrder,
  useDeleteOrder,
  useCustomers,
  useProducts,
} from "../api/hooks";
import { errorMessage } from "../api/client";
import { useToast } from "../components/Toast";
import Modal from "../components/Modal";
import { EmptyState, ErrorState, Field, Spinner } from "../components/ui";
import { money, shortId, dateTime } from "../lib/format";

function OrderForm({ onClose }) {
  const toast = useToast();
  const customers = useCustomers();
  const products = useProducts();
  const createM = useCreateOrder();

  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState([{ product_id: "", quantity: 1 }]);
  const [err, setErr] = useState("");

  const productById = useMemo(
    () => Object.fromEntries((products.data || []).map((p) => [p.id, p])),
    [products.data]
  );

  const total = lines.reduce((sum, l) => {
    const p = productById[l.product_id];
    return p ? sum + Number(p.price) * Number(l.quantity || 0) : sum;
  }, 0);

  const setLine = (i, patch) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { product_id: "", quantity: 1 }]);
  const removeLine = (i) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const submit = async (ev) => {
    ev.preventDefault();
    setErr("");
    if (!customerId) return setErr("Select a customer");
    const valid = lines.filter((l) => l.product_id && Number(l.quantity) > 0);
    if (valid.length === 0) return setErr("Add at least one product line");
    const ids = valid.map((l) => l.product_id);
    if (new Set(ids).size !== ids.length) return setErr("Each product may appear only once");
    // client-side stock pre-check (server is the source of truth)
    for (const l of valid) {
      const p = productById[l.product_id];
      if (p && Number(l.quantity) > p.quantity_in_stock)
        return setErr(`Only ${p.quantity_in_stock} of "${p.name}" in stock`);
    }
    try {
      await createM.mutateAsync({
        customer_id: customerId,
        lines: valid.map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity) })),
      });
      toast.success("Order placed");
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  if (customers.isLoading || products.isLoading) return <Spinner />;

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Customer">
        <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Select a customer…</option>
          {(customers.data || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name} ({c.email})
            </option>
          ))}
        </select>
      </Field>

      <div>
        <label className="label">Order lines</label>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="flex gap-2">
              <select
                className="input flex-1"
                value={l.product_id}
                onChange={(e) => setLine(i, { product_id: e.target.value })}
              >
                <option value="">Select product…</option>
                {(products.data || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {money(p.price)} ({p.quantity_in_stock} in stock)
                  </option>
                ))}
              </select>
              <input
                className="input w-24"
                type="number"
                min="1"
                step="1"
                value={l.quantity}
                onChange={(e) => setLine(i, { quantity: e.target.value })}
              />
              <button
                type="button"
                className="btn-ghost px-3"
                onClick={() => removeLine(i)}
                disabled={lines.length === 1}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn-ghost mt-2 px-3 py-1" onClick={addLine}>
          + Add line
        </button>
      </div>

      {err && <p className="text-sm text-rose-600">{err}</p>}

      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
        <span className="text-sm font-medium text-slate-600">Estimated total</span>
        <span className="text-lg font-bold text-slate-900">{money(total)}</span>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={createM.isPending}>
          Place order
        </button>
      </div>
    </form>
  );
}

function OrderDetail({ id, onClose }) {
  const { data, isLoading, isError, error } = useOrder(id);
  if (isLoading) return <Spinner />;
  if (isError) return <ErrorState message={errorMessage(error)} />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="label">Order ID</p>
          <p className="font-mono text-slate-700">{shortId(data.id)}</p>
        </div>
        <div>
          <p className="label">Status</p>
          <span className="badge bg-brand-100 text-brand-700">{data.status}</span>
        </div>
        <div>
          <p className="label">Customer</p>
          <p className="font-mono text-slate-700">{shortId(data.customer_id)}</p>
        </div>
        <div>
          <p className="label">Placed</p>
          <p className="text-slate-700">{dateTime(data.created_at)}</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2 text-right">Line total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.lines.map((l) => (
              <tr key={l.id}>
                <td className="px-3 py-2 font-mono text-slate-600">{shortId(l.product_id)}</td>
                <td className="px-3 py-2">{l.quantity}</td>
                <td className="px-3 py-2">{money(l.unit_price)}</td>
                <td className="px-3 py-2 text-right">{money(l.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
        <span className="text-sm font-medium text-slate-600">Total</span>
        <span className="text-lg font-bold text-slate-900">{money(data.total_amount)}</span>
      </div>
      <div className="flex justify-end">
        <button className="btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export default function Orders() {
  const toast = useToast();
  const { data, isLoading, isError, error } = useOrders();
  const deleteM = useDeleteOrder();
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const remove = async (o) => {
    if (!confirm("Cancel this order? Stock will be restored.")) return;
    try {
      await deleteM.mutateAsync(o.id);
      toast.success("Order cancelled");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500">Create and track customer orders.</p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          + New order
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <Spinner />
        ) : isError ? (
          <div className="p-4">
            <ErrorState message={errorMessage(error)} />
          </div>
        ) : data.length === 0 ? (
          <EmptyState title="No orders yet" hint="Create your first order." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Placed</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3 font-mono text-slate-600">{shortId(o.id)}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{shortId(o.customer_id)}</td>
                    <td className="px-4 py-3">
                      <span className="badge bg-brand-100 text-brand-700">{o.status}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{money(o.total_amount)}</td>
                    <td className="px-4 py-3 text-slate-500">{dateTime(o.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button className="btn-ghost px-3 py-1" onClick={() => setDetailId(o.id)}>
                          View
                        </button>
                        <button className="btn-danger px-3 py-1" onClick={() => remove(o)}>
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={creating} title="New order" onClose={() => setCreating(false)}>
        <OrderForm onClose={() => setCreating(false)} />
      </Modal>
      <Modal open={!!detailId} title="Order details" onClose={() => setDetailId(null)}>
        {detailId && <OrderDetail id={detailId} onClose={() => setDetailId(null)} />}
      </Modal>
    </div>
  );
}
