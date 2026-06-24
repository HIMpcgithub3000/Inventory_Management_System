import { useMemo, useState } from "react";
import { Check, Search, Plus, Minus, Trash2, ShoppingCart, UserCheck, ClipboardCheck, PartyPopper } from "lucide-react";
import Modal from "../components/Modal";
import { Avatar, EmptyState } from "../components/ui";
import { useCustomers, useProducts, useCreateOrder } from "../api/hooks";
import { errorMessage } from "../api/client";
import { useToast } from "../components/Toast";
import { money } from "../lib/format";
import { stockStatus } from "../lib/status";

const STEPS = [
  { key: "customer", label: "Customer", icon: UserCheck },
  { key: "items", label: "Items", icon: ShoppingCart },
  { key: "review", label: "Review", icon: ClipboardCheck },
];

export default function OrderWizard({ open, onClose }) {
  const toast = useToast();
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const createOrder = useCreateOrder();

  const [step, setStep] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState({}); // productId -> qty
  const [qC, setQC] = useState("");
  const [qP, setQP] = useState("");
  const [done, setDone] = useState(null);

  const reset = () => {
    setStep(0); setCustomerId(""); setLines({}); setQC(""); setQP(""); setDone(null);
  };
  const close = () => { onClose(); setTimeout(reset, 200); };

  const customer = customers.find((c) => c.id === customerId);
  const productById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const lineList = Object.entries(lines).map(([id, qty]) => ({ product: productById[id], qty })).filter((l) => l.product);
  const total = lineList.reduce((s, l) => s + Number(l.product.price) * l.qty, 0);

  const filteredCustomers = customers.filter(
    (c) => !qC || c.full_name.toLowerCase().includes(qC.toLowerCase()) || c.email.toLowerCase().includes(qC.toLowerCase())
  );
  const filteredProducts = products.filter((p) => !qP || p.name.toLowerCase().includes(qP.toLowerCase()) || p.sku.toLowerCase().includes(qP.toLowerCase()));

  const setQty = (id, qty) => {
    const max = productById[id]?.quantity_in_stock ?? 0;
    const clamped = Math.max(0, Math.min(qty, max));
    setLines((l) => {
      const next = { ...l };
      if (clamped <= 0) delete next[id];
      else next[id] = clamped;
      return next;
    });
  };

  const canNext = step === 0 ? !!customerId : step === 1 ? lineList.length > 0 : true;

  const submit = async () => {
    try {
      const order = await createOrder.mutateAsync({
        customer_id: customerId,
        lines: lineList.map((l) => ({ product_id: l.product.id, quantity: l.qty })),
      });
      setDone(order);
      toast.success("Order placed successfully");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const footer = done ? (
    <div className="flex justify-end">
      <button className="btn-primary" onClick={close}>Done</button>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm">
        <span className="text-brand-400">Order total</span>{" "}
        <span className="tnum ml-1 text-base font-bold text-brand-900">{money(total)}</span>
      </div>
      <div className="flex gap-2">
        {step > 0 && (
          <button className="btn-ghost" onClick={() => setStep((s) => s - 1)}>Back</button>
        )}
        {step < 2 ? (
          <button className="btn-primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>Continue</button>
        ) : (
          <button className="btn-accent" disabled={createOrder.isPending} onClick={submit}>
            {createOrder.isPending ? "Placing…" : "Place order"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Modal open={open} onClose={close} title={done ? "Order confirmed" : "New order"} size="max-w-2xl" footer={!done || true ? footer : null}>
      {done ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-stock-50 text-stock-600">
            <PartyPopper className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-brand-900">Order placed</h3>
          <p className="mt-1 text-sm text-brand-400">Stock has been reserved and the order is now live.</p>
          <div className="mt-5 w-full max-w-sm space-y-2 rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-sm">
            <Row label="Customer" value={customer?.full_name} />
            <Row label="Items" value={`${lineList.length} product${lineList.length > 1 ? "s" : ""}`} />
            <Row label="Total" value={money(done.total_amount)} strong />
          </div>
        </div>
      ) : (
        <>
          {/* Stepper */}
          <ol className="mb-6 flex items-center">
            {STEPS.map((s, i) => {
              const state = i < step ? "done" : i === step ? "current" : "todo";
              return (
                <li key={s.key} className="flex flex-1 items-center last:flex-none">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition ${
                        state === "done"
                          ? "border-stock-600 bg-stock-600 text-white"
                          : state === "current"
                          ? "border-brand-900 bg-brand-900 text-white"
                          : "border-brand-200 bg-white text-brand-300"
                      }`}
                    >
                      {state === "done" ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className={`hidden text-sm font-medium sm:block ${state === "todo" ? "text-brand-300" : "text-brand-700"}`}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && <span className={`mx-3 h-0.5 flex-1 rounded ${i < step ? "bg-stock-500" : "bg-brand-100"}`} />}
                </li>
              );
            })}
          </ol>

          {/* Step 1: Customer */}
          {step === 0 && (
            <div>
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-300" />
                <input className="input pl-9" placeholder="Search customers…" value={qC} onChange={(e) => setQC(e.target.value)} />
              </div>
              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <EmptyState title="No customers found" hint="Add a customer first to place an order." />
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCustomerId(c.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                        customerId === c.id ? "border-brand-900 bg-brand-50 ring-1 ring-brand-900" : "border-brand-100 hover:border-brand-200 hover:bg-brand-50"
                      }`}
                    >
                      <Avatar name={c.full_name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-brand-800">{c.full_name}</span>
                        <span className="block truncate text-xs text-brand-400">{c.email}</span>
                      </span>
                      {customerId === c.id && <Check className="h-5 w-5 text-brand-900" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 2: Items */}
          {step === 1 && (
            <div>
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-300" />
                <input className="input pl-9" placeholder="Search products to add…" value={qP} onChange={(e) => setQP(e.target.value)} />
              </div>
              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {filteredProducts.map((p) => {
                  const s = stockStatus(p.quantity_in_stock);
                  const qty = lines[p.id] || 0;
                  const disabled = p.quantity_in_stock <= 0;
                  return (
                    <div key={p.id} className={`flex items-center gap-3 rounded-xl border p-2.5 ${qty ? "border-brand-300 bg-brand-50" : "border-brand-100"}`}>
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand-400 ring-1 ring-brand-100">
                        <ShoppingCart className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-brand-800">{p.name}</span>
                        <span className="block text-xs text-brand-400">
                          {money(p.price)} · <span className={s.key === "out" ? "text-rose-500" : s.key === "low" ? "text-amber-600" : "text-brand-400"}>{p.quantity_in_stock} in stock</span>
                        </span>
                      </span>
                      {qty > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <button className="btn-icon h-7 w-7" onClick={() => setQty(p.id, qty - 1)}><Minus className="h-3.5 w-3.5" /></button>
                          <span className="tnum w-6 text-center text-sm font-semibold">{qty}</span>
                          <button className="btn-icon h-7 w-7" onClick={() => setQty(p.id, qty + 1)} disabled={qty >= p.quantity_in_stock}><Plus className="h-3.5 w-3.5" /></button>
                        </div>
                      ) : (
                        <button className="btn-subtle px-2.5 py-1.5 text-xs" disabled={disabled} onClick={() => setQty(p.id, 1)}>
                          {disabled ? "Out" : "Add"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3">
                <Avatar name={customer?.full_name} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-brand-800">{customer?.full_name}</p>
                  <p className="truncate text-xs text-brand-400">{customer?.email}</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-brand-100">
                {lineList.map((l) => (
                  <div key={l.product.id} className="flex items-center justify-between gap-3 border-b border-brand-50 px-4 py-2.5 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-brand-800">{l.product.name}</p>
                      <p className="tnum text-xs text-brand-400">{l.qty} × {money(l.product.price)}</p>
                    </div>
                    <span className="tnum text-sm font-semibold text-brand-800">{money(Number(l.product.price) * l.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-brand-900 px-4 py-3 text-white">
                <span className="text-sm">Total ({lineList.length} item{lineList.length > 1 ? "s" : ""})</span>
                <span className="tnum text-lg font-bold">{money(total)}</span>
              </div>
              <p className="text-center text-xs text-brand-400">The backend re-computes this total and validates stock on submit.</p>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-brand-400">{label}</span>
      <span className={strong ? "font-bold text-brand-900" : "font-medium text-brand-700"}>{value}</span>
    </div>
  );
}
