import { NavLink } from "react-router-dom";
import { LayoutDashboard, Package, Boxes, ShoppingCart, Users, X, Plus } from "lucide-react";

export const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Catalog",
    items: [
      { to: "/products", label: "Products", icon: Package },
      { to: "/inventory", label: "Inventory", icon: Boxes },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "/orders", label: "Orders", icon: ShoppingCart },
      { to: "/customers", label: "Customers", icon: Users },
    ],
  },
];

export default function Sidebar({ open, onClose, onNewOrder }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-brand-900/40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-brand-100 bg-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-900 text-white">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[15px] font-bold leading-tight text-brand-900">Stockpilot</p>
              <p className="text-[11px] text-brand-400">Inventory &amp; Orders</p>
            </div>
          </div>
          <button className="btn-icon h-8 w-8 lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3">
          <button className="btn-accent w-full" onClick={onNewOrder}>
            <Plus className="h-4 w-4" /> New order
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV_GROUPS.map((g) => (
            <div key={g.label}>
              <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-brand-300">{g.label}</p>
              <div className="space-y-0.5">
                {g.items.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                        isActive ? "bg-brand-900 text-white shadow-sm" : "text-brand-500 hover:bg-brand-50 hover:text-brand-800"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <it.icon className={`h-[18px] w-[18px] ${isActive ? "text-white" : "text-brand-400 group-hover:text-brand-600"}`} />
                        {it.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-brand-100 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-stock-100 text-xs font-semibold text-stock-700">OP</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-brand-800">Operations</p>
              <p className="truncate text-[11px] text-brand-400">admin workspace</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
