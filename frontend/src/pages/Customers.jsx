import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Users, Mail, Phone, Trash2, ShoppingBag } from "lucide-react";
import { useCustomers, useCreateCustomer, useDeleteCustomer, useOrders } from "../api/hooks";
import { errorMessage } from "../api/client";
import { useToast } from "../components/Toast";
import Modal, { ConfirmDialog } from "../components/Modal";
import Drawer from "../components/Drawer";
import DataTable from "../components/DataTable";
import { SearchInput } from "../components/Controls";
import { Avatar, OrderStatusBadge, EmptyState, Field } from "../components/ui";
import { money, dateShort, num, relativeTime } from "../lib/format";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const blank = { full_name: "", email: "", phone: "" };

function CustomerForm({ open, onClose }) {
  const toast = useToast();
  const createM = useCreateCustomer();
  const [form, setForm] = useState(blank);
  const [errs, setErrs] = useState({});
  useEffect(() => { if (open) { setForm(blank); setErrs({}); } }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!form.full_name.trim()) v.full_name = "Name is required";
    if (!emailRe.test(form.email)) v.email = "Enter a valid email";
    setErrs(v);
    if (Object.keys(v).length) return;
    try {
      await createM.mutateAsync({ full_name: form.full_name.trim(), email: form.email.trim(), phone: form.phone.trim() || null });
      toast.success("Customer created");
      onClose();
    } catch (err) { toast.error(errorMessage(err)); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add customer"
      subtitle="Create a new customer record"
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose} disabled={createM.isPending}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={createM.isPending}>{createM.isPending ? "Saving…" : "Create customer"}</button>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name" required error={errs.full_name}>
          <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. Ada Lovelace" autoFocus />
        </Field>
        <Field label="Email" required error={errs.email} hint="Must be unique">
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" />
        </Field>
        <Field label="Phone">
          <input className="input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 012 3456" />
        </Field>
      </form>
    </Modal>
  );
}

function CustomerDrawer({ customer, orders, onClose, onDelete }) {
  if (!customer) return null;
  const theirs = (orders || []).filter((o) => o.customer_id === customer.id);
  const spent = theirs.filter((o) => o.status === "PLACED").reduce((s, o) => s + Number(o.total_amount), 0);
  const last = theirs[0];

  return (
    <Drawer
      open={!!customer}
      onClose={onClose}
      title={customer.full_name}
      subtitle={customer.email}
      footer={<div className="flex justify-end"><button className="btn-danger" onClick={() => onDelete(customer)}><Trash2 className="h-4 w-4" /> Delete customer</button></div>}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar name={customer.full_name} size="lg" />
          <div className="min-w-0 space-y-1 text-sm">
            <p className="flex items-center gap-2 text-brand-600"><Mail className="h-4 w-4 text-brand-300" /> {customer.email}</p>
            {customer.phone && <p className="flex items-center gap-2 text-brand-600"><Phone className="h-4 w-4 text-brand-300" /> {customer.phone}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Orders" value={num(theirs.length)} />
          <Stat label="Total spent" value={money(spent)} />
          <Stat label="Last order" value={last ? relativeTime(last.created_at) : "—"} small />
        </div>

        <div className="card overflow-hidden">
          <p className="border-b border-brand-100 px-4 py-3 text-sm font-semibold text-brand-700">Order history</p>
          {theirs.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="No orders yet" hint="This customer hasn’t placed an order." />
          ) : (
            <div className="divide-y divide-brand-50">
              {theirs.map((o) => (
                <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-400"><ShoppingBag className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-brand-500">{o.id.slice(0, 8)}</p>
                    <p className="text-xs text-brand-400">{dateShort(o.created_at)} · {o.lines?.length || 0} item{(o.lines?.length || 0) !== 1 ? "s" : ""}</p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                  <span className="tnum text-sm font-semibold text-brand-800">{money(o.total_amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-brand-400">Customer since {dateShort(customer.created_at)}</p>
      </div>
    </Drawer>
  );
}

function Stat({ label, value, small }) {
  return (
    <div className="card p-3.5">
      <p className="text-xs text-brand-400">{label}</p>
      <p className={`mt-1 font-bold text-brand-900 ${small ? "text-sm" : "tnum text-lg"}`}>{value}</p>
    </div>
  );
}

export default function Customers() {
  const toast = useToast();
  const { data: customers, isLoading, isError, error, refetch } = useCustomers();
  const { data: orders = [] } = useOrders();
  const deleteM = useDeleteCustomer();
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    if (params.get("new")) { setFormOpen(true); params.delete("new"); setParams(params, { replace: true }); }
    const focus = params.get("focus");
    if (focus && customers) {
      const c = customers.find((x) => x.id === focus);
      if (c) setDetail(c);
      params.delete("focus"); setParams(params, { replace: true });
    }
  }, [params, customers]); // eslint-disable-line

  const orderStats = useMemo(() => {
    const map = {};
    for (const o of orders) {
      const e = (map[o.customer_id] ||= { count: 0, spent: 0 });
      e.count++;
      if (o.status === "PLACED") e.spent += Number(o.total_amount);
    }
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    let list = customers || [];
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((c) => c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
    return list;
  }, [customers, query]);

  const doDelete = async () => {
    try {
      await deleteM.mutateAsync(confirm.id);
      toast.success("Customer deleted");
      setDetail(null); setConfirm(null);
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const columns = [
    { key: "full_name", header: "Customer", sortable: true, sortValue: (r) => r.full_name.toLowerCase(), render: (r) => (
      <div className="flex items-center gap-3">
        <Avatar name={r.full_name} size="sm" />
        <div className="min-w-0"><p className="truncate font-medium text-brand-800">{r.full_name}</p><p className="truncate text-xs text-brand-400">{r.email}</p></div>
      </div>
    ) },
    { key: "phone", header: "Phone", render: (r) => <span className="text-brand-500">{r.phone || "—"}</span> },
    { key: "orders", header: "Orders", align: "right", sortable: true, sortValue: (r) => orderStats[r.id]?.count || 0, render: (r) => <span className="tnum font-medium text-brand-700">{orderStats[r.id]?.count || 0}</span> },
    { key: "spent", header: "Total spent", align: "right", sortable: true, sortValue: (r) => orderStats[r.id]?.spent || 0, render: (r) => <span className="tnum font-semibold text-brand-800">{money(orderStats[r.id]?.spent || 0)}</span> },
    { key: "created_at", header: "Joined", align: "right", sortable: true, sortValue: (r) => r.created_at, render: (r) => <span className="text-xs text-brand-400">{dateShort(r.created_at)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name or email…" className="sm:max-w-xs" />
        <button className="btn-primary" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> Add customer</button>
      </div>

      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          loading={isLoading}
          error={isError ? errorMessage(error) : null}
          onRetry={refetch}
          onRowClick={(r) => setDetail(r)}
          initialSort={{ key: "created_at", dir: "desc" }}
          empty={<EmptyState icon={Users} title={query ? "No matching customers" : "No customers yet"} hint={query ? "Try a different search." : "Add your first customer to get started."} action={!query && <button className="btn-primary" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> Add customer</button>} />}
        />
      </div>

      <CustomerForm open={formOpen} onClose={() => setFormOpen(false)} />
      <CustomerDrawer customer={detail} orders={orders} onClose={() => setDetail(null)} onDelete={(c) => setConfirm(c)} />
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doDelete}
        danger
        busy={deleteM.isPending}
        title="Delete customer?"
        message={`“${confirm?.full_name}” will be removed. Their existing orders keep their history.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
