import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search, Package, Users, ShoppingCart, Plus, CornerDownLeft } from "lucide-react";
import { useProducts, useCustomers, useOrders } from "../api/hooks";
import { money, shortId } from "../lib/format";

export default function CommandPalette({ open, onClose, onNewOrder }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const { data: orders = [] } = useOrders();

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const actions = [
      { type: "action", id: "a-order", label: "Create new order", icon: ShoppingCart, run: () => onNewOrder() },
      { type: "action", id: "a-product", label: "Add new product", icon: Package, run: () => navigate("/products?new=1") },
      { type: "action", id: "a-customer", label: "Add new customer", icon: Users, run: () => navigate("/customers?new=1") },
    ].filter((a) => !term || a.label.toLowerCase().includes(term));

    if (!term) return [{ group: "Quick actions", items: actions }];

    const prod = products
      .filter((p) => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term))
      .slice(0, 5)
      .map((p) => ({ type: "product", id: p.id, label: p.name, meta: `${p.sku} · ${money(p.price)}`, icon: Package, run: () => navigate(`/products?focus=${p.id}`) }));
    const cust = customers
      .filter((c) => c.full_name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term))
      .slice(0, 5)
      .map((c) => ({ type: "customer", id: c.id, label: c.full_name, meta: c.email, icon: Users, run: () => navigate(`/customers?focus=${c.id}`) }));
    const ord = orders
      .filter((o) => o.id.toLowerCase().includes(term))
      .slice(0, 4)
      .map((o) => ({ type: "order", id: o.id, label: `Order ${shortId(o.id)}`, meta: money(o.total_amount), icon: ShoppingCart, run: () => navigate(`/orders?focus=${o.id}`) }));

    const groups = [];
    if (actions.length) groups.push({ group: "Actions", items: actions });
    if (prod.length) groups.push({ group: "Products", items: prod });
    if (cust.length) groups.push({ group: "Customers", items: cust });
    if (ord.length) groups.push({ group: "Orders", items: ord });
    return groups;
  }, [q, products, customers, orders, navigate, onNewOrder]);

  const flat = results.flatMap((g) => g.items);

  const select = (item) => {
    if (!item) return;
    onClose();
    item.run();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(flat[active]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;
  let idx = -1;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-brand-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl animate-scale-in overflow-hidden rounded-2xl bg-white shadow-pop">
        <div className="flex items-center gap-3 border-b border-brand-100 px-4">
          <Search className="h-5 w-5 text-brand-300" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search products, customers, orders…"
            className="w-full bg-transparent py-4 text-sm text-brand-800 placeholder:text-brand-300 focus:outline-none"
          />
          <kbd className="rounded border border-brand-200 px-1.5 py-0.5 text-[10px] font-semibold text-brand-400">ESC</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {flat.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-brand-400">No results for “{q}”.</p>
          ) : (
            results.map((g) => (
              <div key={g.group} className="mb-1">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-300">{g.group}</p>
                {g.items.map((item) => {
                  idx++;
                  const isActive = idx === active;
                  const me = idx;
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setActive(me)}
                      onClick={() => select(item)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                        isActive ? "bg-brand-900 text-white" : "text-brand-700 hover:bg-brand-50"
                      }`}
                    >
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${isActive ? "bg-white/15 text-white" : item.type === "action" ? "bg-stock-50 text-stock-600" : "bg-brand-50 text-brand-400"}`}>
                        {item.type === "action" ? <Plus className="h-4 w-4" /> : <item.icon className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.label}</span>
                        {item.meta && <span className={`block truncate text-xs ${isActive ? "text-white/70" : "text-brand-400"}`}>{item.meta}</span>}
                      </span>
                      {isActive && <CornerDownLeft className="h-4 w-4 opacity-70" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
