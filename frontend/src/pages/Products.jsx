import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Package, Pencil, Trash2, Tag, Boxes } from "lucide-react";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useOrders } from "../api/hooks";
import { errorMessage } from "../api/client";
import { useToast } from "../components/Toast";
import Modal, { ConfirmDialog } from "../components/Modal";
import Drawer from "../components/Drawer";
import DataTable from "../components/DataTable";
import { SearchInput, Segmented } from "../components/Controls";
import { Badge, StockBadge, EmptyState, Field, ProgressBar } from "../components/ui";
import { money, dateShort, num } from "../lib/format";
import { stockStatus } from "../lib/status";

const blank = { name: "", sku: "", price: "", quantity_in_stock: "" };

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = "Name is required";
  if (!f.sku.trim()) e.sku = "SKU is required";
  if (f.price === "" || Number(f.price) < 0) e.price = "Price must be ≥ 0";
  if (f.quantity_in_stock === "" || Number(f.quantity_in_stock) < 0 || !Number.isInteger(Number(f.quantity_in_stock)))
    e.quantity_in_stock = "Whole number ≥ 0";
  return e;
}

function ProductForm({ open, onClose, editing }) {
  const toast = useToast();
  const createM = useCreateProduct();
  const updateM = useUpdateProduct();
  const [form, setForm] = useState(blank);
  const [errs, setErrs] = useState({});

  useEffect(() => {
    if (open) {
      setForm(editing ? { name: editing.name, sku: editing.sku, price: editing.price, quantity_in_stock: editing.quantity_in_stock } : blank);
      setErrs({});
    }
  }, [open, editing]);

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(form);
    setErrs(v);
    if (Object.keys(v).length) return;
    const body = { name: form.name.trim(), sku: form.sku.trim(), price: String(form.price), quantity_in_stock: Number(form.quantity_in_stock) };
    try {
      if (editing) { await updateM.mutateAsync({ id: editing.id, body }); toast.success("Product updated"); }
      else { await createM.mutateAsync(body); toast.success("Product created"); }
      onClose();
    } catch (err) { toast.error(errorMessage(err)); }
  };

  const busy = createM.isPending || updateM.isPending;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit product" : "Add product"}
      subtitle={editing ? editing.sku : "Add an item to your catalog"}
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create product"}</button>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Product name" required error={errs.name}>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mechanical Keyboard" autoFocus />
        </Field>
        <Field label="SKU / Code" required error={errs.sku} hint="Must be unique across active products">
          <input className="input font-mono" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. KEY-204" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (USD)" required error={errs.price}>
            <input className="input tnum" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
          </Field>
          <Field label="Quantity in stock" required error={errs.quantity_in_stock}>
            <input className="input tnum" type="number" step="1" min="0" value={form.quantity_in_stock} onChange={(e) => setForm({ ...form, quantity_in_stock: e.target.value })} placeholder="0" />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

function ProductDrawer({ product, orders, onClose, onEdit, onDelete }) {
  if (!product) return null;
  const st = stockStatus(product.quantity_in_stock);
  const value = Number(product.price) * product.quantity_in_stock;
  const related = (orders || []).filter((o) => o.lines?.some((l) => l.product_id === product.id));
  const unitsSold = related.reduce((s, o) => s + o.lines.filter((l) => l.product_id === product.id).reduce((x, l) => x + l.quantity, 0), 0);

  return (
    <Drawer
      open={!!product}
      onClose={onClose}
      title={product.name}
      subtitle={<span className="font-mono">{product.sku}</span>}
      badge={<StockBadge qty={product.quantity_in_stock} />}
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => onEdit(product)}><Pencil className="h-4 w-4" /> Edit</button>
          <button className="btn-danger" onClick={() => onDelete(product)}><Trash2 className="h-4 w-4" /> Delete</button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Unit price" value={money(product.price)} />
          <Stat label="On hand" value={num(product.quantity_in_stock)} />
          <Stat label="Stock value" value={money(value)} />
          <Stat label="Units ordered" value={num(unitsSold)} />
        </div>

        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-brand-600">Stock level</span>
            <Badge tone={st.tone} dot>{st.label}</Badge>
          </div>
          <ProgressBar value={Math.min(100, (product.quantity_in_stock / Math.max(20, product.quantity_in_stock)) * 100)} tone={st.tone} />
          <p className="mt-2 text-xs text-brand-400">{product.quantity_in_stock} units available</p>
        </div>

        <div className="card overflow-hidden">
          <p className="border-b border-brand-100 px-4 py-3 text-sm font-semibold text-brand-700">Orders with this product</p>
          {related.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-brand-400">Not ordered yet.</p>
          ) : (
            <div className="divide-y divide-brand-50">
              {related.slice(0, 6).map((o) => (
                <div key={o.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-mono text-xs text-brand-500">{o.id.slice(0, 8)}</span>
                  <span className="text-brand-400">{dateShort(o.created_at)}</span>
                  <span className="tnum font-semibold text-brand-700">{money(o.total_amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-brand-400">
          <span>Created {dateShort(product.created_at)}</span>
          <span>Updated {dateShort(product.updated_at)}</span>
        </div>
      </div>
    </Drawer>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card p-3.5">
      <p className="text-xs text-brand-400">{label}</p>
      <p className="tnum mt-1 text-lg font-bold text-brand-900">{value}</p>
    </div>
  );
}

export default function Products() {
  const toast = useToast();
  const { data: products, isLoading, isError, error, refetch } = useProducts();
  const { data: orders = [] } = useOrders();
  const deleteM = useDeleteProduct();
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null); // {type:'one'|'bulk', product?}

  // Deep links: ?new=1 opens create, ?focus=<id> opens detail.
  useEffect(() => {
    if (params.get("new")) { setEditing(null); setFormOpen(true); params.delete("new"); setParams(params, { replace: true }); }
    const focus = params.get("focus");
    if (focus && products) {
      const p = products.find((x) => x.id === focus);
      if (p) setDetail(p);
      params.delete("focus"); setParams(params, { replace: true });
    }
  }, [params, products]); // eslint-disable-line

  const counts = useMemo(() => {
    const all = products || [];
    return {
      all: all.length,
      in: all.filter((p) => stockStatus(p.quantity_in_stock).key === "in").length,
      low: all.filter((p) => stockStatus(p.quantity_in_stock).key === "low").length,
      out: all.filter((p) => stockStatus(p.quantity_in_stock).key === "out").length,
    };
  }, [products]);

  const filtered = useMemo(() => {
    let list = products || [];
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    if (filter !== "all") list = list.filter((p) => stockStatus(p.quantity_in_stock).key === filter);
    return list;
  }, [products, query, filter]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p) => { setDetail(null); setEditing(p); setFormOpen(true); };

  const doDelete = async () => {
    try {
      if (confirm.type === "bulk") {
        await Promise.all(selected.map((id) => deleteM.mutateAsync(id)));
        toast.success(`${selected.length} product${selected.length > 1 ? "s" : ""} deleted`);
        setSelected([]);
      } else {
        await deleteM.mutateAsync(confirm.product.id);
        toast.success("Product deleted");
        setDetail(null);
      }
      setConfirm(null);
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const columns = [
    {
      key: "name", header: "Product", sortable: true, sortValue: (r) => r.name.toLowerCase(),
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-400"><Package className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate font-medium text-brand-800">{r.name}</p>
            <p className="font-mono text-xs text-brand-400">{r.sku}</p>
          </div>
        </div>
      ),
    },
    { key: "price", header: "Price", sortable: true, align: "right", sortValue: (r) => Number(r.price), render: (r) => <span className="tnum font-medium">{money(r.price)}</span> },
    {
      key: "quantity_in_stock", header: "Stock", sortable: true, align: "right", sortValue: (r) => r.quantity_in_stock,
      render: (r) => <span className={`tnum font-semibold ${stockStatus(r.quantity_in_stock).key === "out" ? "text-rose-600" : stockStatus(r.quantity_in_stock).key === "low" ? "text-amber-600" : "text-brand-700"}`}>{r.quantity_in_stock}</span>,
    },
    { key: "status", header: "Status", render: (r) => <StockBadge qty={r.quantity_in_stock} /> },
    { key: "updated_at", header: "Updated", sortable: true, align: "right", sortValue: (r) => r.updated_at, render: (r) => <span className="text-xs text-brand-400">{dateShort(r.updated_at)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by name or SKU…" className="sm:max-w-xs" />
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "in", label: "In stock", count: counts.in },
              { value: "low", label: "Low", count: counts.low },
              { value: "out", label: "Out", count: counts.out },
            ]}
          />
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Add product</button>
      </div>

      {selected.length > 0 && (
        <div className="flex animate-slide-up items-center justify-between rounded-xl border border-brand-200 bg-brand-900 px-4 py-2.5 text-white">
          <span className="text-sm font-medium">{selected.length} selected</span>
          <div className="flex gap-2">
            <button className="btn px-3 py-1.5 text-sm text-white/80 hover:text-white" onClick={() => setSelected([])}>Clear</button>
            <button className="btn-danger px-3 py-1.5 text-sm" onClick={() => setConfirm({ type: "bulk" })}><Trash2 className="h-4 w-4" /> Delete</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          loading={isLoading}
          error={isError ? errorMessage(error) : null}
          onRetry={refetch}
          selectable
          selected={selected}
          onSelectedChange={setSelected}
          onRowClick={(r) => setDetail(r)}
          initialSort={{ key: "name", dir: "asc" }}
          empty={<EmptyState icon={Package} title={query || filter !== "all" ? "No matching products" : "No products yet"} hint={query || filter !== "all" ? "Try adjusting your search or filter." : "Add your first product to start tracking inventory."} action={!query && filter === "all" && <button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Add product</button>} />}
        />
      </div>

      <ProductForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
      <ProductDrawer product={detail} orders={orders} onClose={() => setDetail(null)} onEdit={openEdit} onDelete={(p) => setConfirm({ type: "one", product: p })} />
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doDelete}
        danger
        busy={deleteM.isPending}
        title={confirm?.type === "bulk" ? `Delete ${selected.length} products?` : "Delete product?"}
        message={confirm?.type === "bulk" ? "These products will be removed from your catalog. Existing orders keep their history." : `“${confirm?.product?.name}” will be removed from your catalog. Existing orders keep their history.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
