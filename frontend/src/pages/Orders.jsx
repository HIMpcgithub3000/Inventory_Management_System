import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, ShoppingCart, XCircle, CheckCircle2, Package, Ban, Clock } from "lucide-react";
import { useOrders, useDeleteOrder } from "../api/hooks";
import { errorMessage } from "../api/client";
import { useToast } from "../components/Toast";
import { ConfirmDialog } from "../components/Modal";
import Drawer from "../components/Drawer";
import DataTable from "../components/DataTable";
import { SearchInput, Segmented } from "../components/Controls";
import { useLookups } from "../lib/lookups";
import { Avatar, OrderStatusBadge, EmptyState } from "../components/ui";
import { money, dateTime, dateShort, shortId, num } from "../lib/format";

function Timeline({ order }) {
  const steps = [
    { label: "Order placed", at: order.created_at, icon: CheckCircle2, tone: "text-stock-600 bg-stock-50", done: true },
    { label: "Stock reserved", at: order.created_at, icon: Package, tone: "text-brand-600 bg-brand-50", done: true },
  ];
  if (order.status === "CANCELLED")
    steps.push({ label: "Order cancelled", at: order.updated_at, icon: Ban, tone: "text-rose-600 bg-rose-50", done: true });
  else
    steps.push({ label: "Awaiting fulfillment", at: null, icon: Clock, tone: "text-brand-300 bg-brand-50", done: false });

  return (
    <ol className="relative space-y-4 pl-2">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${s.tone}`}><s.icon className="h-4 w-4" /></span>
            {i < steps.length - 1 && <span className={`mt-1 w-0.5 flex-1 ${s.done ? "bg-brand-200" : "bg-brand-100"}`} style={{ minHeight: 18 }} />}
          </div>
          <div className="pb-1">
            <p className={`text-sm font-medium ${s.done ? "text-brand-800" : "text-brand-400"}`}>{s.label}</p>
            <p className="text-xs text-brand-400">{s.at ? dateTime(s.at) : "Pending"}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function OrderDrawer({ order, customer, productById, onClose, onCancel }) {
  if (!order) return null;
  return (
    <Drawer
      open={!!order}
      onClose={onClose}
      title={`Order ${shortId(order.id)}`}
      subtitle={dateTime(order.created_at)}
      badge={<OrderStatusBadge status={order.status} />}
      footer={
        order.status === "PLACED" ? (
          <div className="flex justify-end"><button className="btn-danger" onClick={() => onCancel(order)}><XCircle className="h-4 w-4" /> Cancel order</button></div>
        ) : (
          <p className="text-center text-sm text-brand-400">This order was cancelled and stock was restored.</p>
        )
      }
    >
      <div className="space-y-5">
        {customer && (
          <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-white p-3">
            <Avatar name={customer.full_name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-brand-800">{customer.full_name}</p>
              <p className="truncate text-xs text-brand-400">{customer.email}</p>
            </div>
          </div>
        )}

        <div className="card overflow-hidden">
          <p className="border-b border-brand-100 px-4 py-3 text-sm font-semibold text-brand-700">Items ({order.lines?.length || 0})</p>
          <div className="divide-y divide-brand-50">
            {(order.lines || []).map((l) => {
              const p = productById[l.product_id];
              return (
                <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-400"><Package className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-brand-800">{p?.name || "Deleted product"}</p>
                    <p className="tnum text-xs text-brand-400">{l.quantity} × {money(l.unit_price)}</p>
                  </div>
                  <span className="tnum text-sm font-semibold text-brand-800">{money(l.line_total)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between bg-brand-900 px-4 py-3 text-white">
            <span className="text-sm">Order total</span>
            <span className="tnum text-lg font-bold">{money(order.total_amount)}</span>
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-brand-700">Timeline</p>
          <Timeline order={order} />
        </div>
      </div>
    </Drawer>
  );
}

export default function Orders({ onNewOrder }) {
  const toast = useToast();
  const { data: orders, isLoading, isError, error, refetch } = useOrders();
  const deleteM = useDeleteOrder();
  const { productById, customerById } = useLookups();
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    const focus = params.get("focus");
    if (focus && orders) {
      const o = orders.find((x) => x.id === focus);
      if (o) setDetail(o);
      params.delete("focus"); setParams(params, { replace: true });
    }
  }, [params, orders]); // eslint-disable-line

  const counts = useMemo(() => {
    const all = orders || [];
    return { all: all.length, placed: all.filter((o) => o.status === "PLACED").length, cancelled: all.filter((o) => o.status === "CANCELLED").length };
  }, [orders]);

  const filtered = useMemo(() => {
    let list = orders || [];
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((o) => o.id.toLowerCase().includes(q) || customerById[o.customer_id]?.full_name?.toLowerCase().includes(q));
    if (filter !== "all") list = list.filter((o) => o.status === (filter === "placed" ? "PLACED" : "CANCELLED"));
    return list;
  }, [orders, query, filter, customerById]);

  const doCancel = async () => {
    try {
      await deleteM.mutateAsync(confirm.id);
      toast.success("Order cancelled · stock restored");
      setDetail(null); setConfirm(null);
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const columns = [
    { key: "id", header: "Order", sortable: true, sortValue: (r) => r.created_at, render: (r) => (
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-400"><ShoppingCart className="h-4 w-4" /></span>
        <div><p className="font-mono text-sm font-medium text-brand-800">{shortId(r.id)}</p><p className="text-xs text-brand-400">{dateShort(r.created_at)}</p></div>
      </div>
    ) },
    { key: "customer", header: "Customer", render: (r) => {
      const c = customerById[r.customer_id];
      return c ? (
        <div className="flex items-center gap-2.5"><Avatar name={c.full_name} size="sm" /><span className="truncate text-sm text-brand-700">{c.full_name}</span></div>
      ) : <span className="text-sm text-brand-300">Unknown</span>;
    } },
    { key: "items", header: "Items", align: "right", render: (r) => <span className="tnum text-brand-600">{num(r.lines?.length || 0)}</span> },
    { key: "total_amount", header: "Total", align: "right", sortable: true, sortValue: (r) => Number(r.total_amount), render: (r) => <span className="tnum font-semibold text-brand-900">{money(r.total_amount)}</span> },
    { key: "status", header: "Status", render: (r) => <OrderStatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by order id or customer…" className="sm:max-w-xs" />
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "placed", label: "Placed", count: counts.placed },
              { value: "cancelled", label: "Cancelled", count: counts.cancelled },
            ]}
          />
        </div>
        <button className="btn-primary" onClick={onNewOrder}><Plus className="h-4 w-4" /> New order</button>
      </div>

      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          loading={isLoading}
          error={isError ? errorMessage(error) : null}
          onRetry={refetch}
          onRowClick={(r) => setDetail(r)}
          initialSort={{ key: "id", dir: "desc" }}
          empty={<EmptyState icon={ShoppingCart} title={query || filter !== "all" ? "No matching orders" : "No orders yet"} hint={query || filter !== "all" ? "Try a different search or filter." : "Create your first order to see it here."} action={!query && filter === "all" && <button className="btn-primary" onClick={onNewOrder}><Plus className="h-4 w-4" /> New order</button>} />}
        />
      </div>

      <OrderDrawer order={detail} customer={detail && customerById[detail.customer_id]} productById={productById} onClose={() => setDetail(null)} onCancel={(o) => setConfirm(o)} />
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doCancel}
        danger
        busy={deleteM.isPending}
        title="Cancel this order?"
        message="The order will be cancelled and all reserved stock will be returned to inventory."
        confirmLabel="Cancel order"
      />
    </div>
  );
}
