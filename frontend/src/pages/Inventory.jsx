import { useEffect, useMemo, useState } from "react";
import { Boxes, AlertTriangle, PackageX, CheckCircle2, SlidersHorizontal, Plus, Minus } from "lucide-react";
import { useProducts, useUpdateProduct } from "../api/hooks";
import { errorMessage } from "../api/client";
import { useToast } from "../components/Toast";
import Modal from "../components/Modal";
import DataTable from "../components/DataTable";
import { SearchInput, Segmented } from "../components/Controls";
import { StockBadge, EmptyState, ProgressBar, Field } from "../components/ui";
import { money, num } from "../lib/format";
import { stockStatus, LOW_STOCK_DEFAULT } from "../lib/status";

function MetricCard({ icon: Icon, label, value, tone }) {
  const tones = {
    slate: "bg-brand-50 text-brand-600",
    emerald: "bg-stock-50 text-stock-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
      <div>
        <p className="tnum text-xl font-bold text-brand-900">{value}</p>
        <p className="text-xs text-brand-400">{label}</p>
      </div>
    </div>
  );
}

function AdjustModal({ product, onClose }) {
  const toast = useToast();
  const updateM = useUpdateProduct();
  const [qty, setQty] = useState(0);
  useEffect(() => { if (product) setQty(product.quantity_in_stock); }, [product]);
  if (!product) return null;

  const save = async () => {
    try {
      await updateM.mutateAsync({ id: product.id, body: { quantity_in_stock: Number(qty) } });
      toast.success(`Stock updated for ${product.name}`);
      onClose();
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const delta = Number(qty) - product.quantity_in_stock;

  return (
    <Modal
      open={!!product}
      onClose={onClose}
      title="Adjust stock"
      subtitle={product.name}
      size="max-w-sm"
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={updateM.isPending || Number(qty) < 0}>{updateM.isPending ? "Saving…" : "Update stock"}</button>
        </div>
      }
    >
      <Field label="On-hand quantity">
        <div className="flex items-center gap-2">
          <button className="btn-icon h-11 w-11" onClick={() => setQty((q) => Math.max(0, Number(q) - 1))}><Minus className="h-4 w-4" /></button>
          <input className="input tnum h-11 text-center text-lg font-bold" type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} />
          <button className="btn-icon h-11 w-11" onClick={() => setQty((q) => Number(q) + 1)}><Plus className="h-4 w-4" /></button>
        </div>
      </Field>
      {delta !== 0 && (
        <p className={`mt-3 text-center text-sm font-medium ${delta > 0 ? "text-stock-600" : "text-amber-600"}`}>
          {delta > 0 ? "+" : ""}{delta} units {delta > 0 ? "added" : "removed"}
        </p>
      )}
    </Modal>
  );
}

export default function Inventory() {
  const { data: products, isLoading, isError, error, refetch } = useProducts();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [adjust, setAdjust] = useState(null);

  const m = useMemo(() => {
    const all = products || [];
    return {
      skus: all.length,
      healthy: all.filter((p) => stockStatus(p.quantity_in_stock).key === "in").length,
      low: all.filter((p) => stockStatus(p.quantity_in_stock).key === "low").length,
      out: all.filter((p) => stockStatus(p.quantity_in_stock).key === "out").length,
      units: all.reduce((s, p) => s + p.quantity_in_stock, 0),
      value: all.reduce((s, p) => s + Number(p.price) * p.quantity_in_stock, 0),
    };
  }, [products]);

  const filtered = useMemo(() => {
    let list = products || [];
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    if (filter !== "all") list = list.filter((p) => stockStatus(p.quantity_in_stock).key === filter);
    return list;
  }, [products, query, filter]);

  const peak = Math.max(20, ...(products || []).map((p) => p.quantity_in_stock));

  const columns = [
    { key: "name", header: "Product", sortable: true, sortValue: (r) => r.name.toLowerCase(), render: (r) => (
      <div className="min-w-0"><p className="truncate font-medium text-brand-800">{r.name}</p><p className="font-mono text-xs text-brand-400">{r.sku}</p></div>
    ) },
    { key: "level", header: "Stock level", className: "w-48", render: (r) => {
      const st = stockStatus(r.quantity_in_stock);
      return <div className="w-40"><ProgressBar value={(r.quantity_in_stock / peak) * 100} tone={st.tone} /></div>;
    } },
    { key: "quantity_in_stock", header: "On hand", sortable: true, align: "right", sortValue: (r) => r.quantity_in_stock, render: (r) => {
      const st = stockStatus(r.quantity_in_stock);
      return <span className={`tnum font-semibold ${st.key === "out" ? "text-rose-600" : st.key === "low" ? "text-amber-600" : "text-brand-700"}`}>{r.quantity_in_stock}</span>;
    } },
    { key: "status", header: "Status", render: (r) => <StockBadge qty={r.quantity_in_stock} /> },
    { key: "value", header: "Stock value", sortable: true, align: "right", sortValue: (r) => Number(r.price) * r.quantity_in_stock, render: (r) => <span className="tnum text-brand-600">{money(Number(r.price) * r.quantity_in_stock)}</span> },
    { key: "actions", header: "", align: "right", render: (r) => (
      <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={(e) => { e.stopPropagation(); setAdjust(r); }}><SlidersHorizontal className="h-3.5 w-3.5" /> Adjust</button>
    ) },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard icon={Boxes} label="Total SKUs" value={num(m.skus)} tone="slate" />
        <MetricCard icon={CheckCircle2} label="Healthy" value={num(m.healthy)} tone="emerald" />
        <MetricCard icon={AlertTriangle} label="Low stock" value={num(m.low)} tone="amber" />
        <MetricCard icon={PackageX} label="Out of stock" value={num(m.out)} tone="rose" />
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-xs text-brand-400">Total inventory value</p>
          <p className="tnum text-2xl font-bold text-brand-900">{money(m.value)}</p>
        </div>
        <div className="h-10 w-px bg-brand-100" />
        <div>
          <p className="text-xs text-brand-400">Total units on hand</p>
          <p className="tnum text-2xl font-bold text-brand-900">{num(m.units)}</p>
        </div>
        <div className="ml-auto rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-500">
          Reorder threshold: <span className="tnum font-semibold text-brand-700">{LOW_STOCK_DEFAULT} units</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={query} onChange={setQuery} placeholder="Search inventory…" className="sm:max-w-xs" />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: m.skus },
            { value: "low", label: "Low", count: m.low },
            { value: "out", label: "Out", count: m.out },
          ]}
        />
      </div>

      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          loading={isLoading}
          error={isError ? errorMessage(error) : null}
          onRetry={refetch}
          initialSort={{ key: "quantity_in_stock", dir: "asc" }}
          empty={<EmptyState icon={Boxes} title="No inventory to show" hint="Add products to start tracking stock levels." />}
        />
      </div>

      <AdjustModal product={adjust} onClose={() => setAdjust(null)} />
    </div>
  );
}
