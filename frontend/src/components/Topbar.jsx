import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, Bell, ChevronDown, AlertTriangle, PackageX } from "lucide-react";
import { useProducts } from "../api/hooks";
import { stockStatus } from "../lib/status";

function Dropdown({ open, onClose, align = "right", children }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={`absolute z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] animate-scale-in rounded-xl border border-brand-100 bg-white shadow-pop ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        {children}
      </div>
    </>
  );
}

export default function Topbar({ title, subtitle, onMenu, onOpenSearch, actions }) {
  const navigate = useNavigate();
  const { data: products = [] } = useProducts();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const alerts = products
    .map((p) => ({ ...p, s: stockStatus(p.quantity_in_stock) }))
    .filter((p) => p.s.key !== "in")
    .sort((a, b) => a.quantity_in_stock - b.quantity_in_stock);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-brand-100 bg-white/85 px-4 py-3 backdrop-blur-md sm:px-6">
      <button className="btn-icon h-9 w-9 lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold text-brand-900">{title}</h1>
        {subtitle && <p className="truncate text-xs text-brand-400">{subtitle}</p>}
      </div>

      {/* Global search trigger */}
      <button
        onClick={onOpenSearch}
        className="hidden items-center gap-2 rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2 text-sm text-brand-400 transition hover:border-brand-300 hover:bg-white sm:flex"
      >
        <Search className="h-4 w-4" />
        <span>Search…</span>
        <kbd className="ml-3 rounded border border-brand-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-brand-400">⌘K</kbd>
      </button>
      <button onClick={onOpenSearch} className="btn-icon h-9 w-9 sm:hidden" aria-label="Search">
        <Search className="h-5 w-5" />
      </button>

      {actions}

      {/* Notifications */}
      <div className="relative">
        <button className="btn-icon relative h-9 w-9" onClick={() => setNotifOpen((o) => !o)} aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {alerts.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {alerts.length}
            </span>
          )}
        </button>
        <Dropdown open={notifOpen} onClose={() => setNotifOpen(false)}>
          <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3">
            <p className="text-sm font-semibold text-brand-800">Inventory alerts</p>
            <span className="tnum text-xs text-brand-400">{alerts.length}</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-brand-400">All stock levels are healthy.</p>
            ) : (
              alerts.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setNotifOpen(false);
                    navigate("/inventory");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-brand-50"
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${p.s.key === "out" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>
                    {p.s.key === "out" ? <PackageX className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-brand-700">{p.name}</span>
                    <span className="block text-xs text-brand-400">{p.s.label} · {p.quantity_in_stock} left</span>
                  </span>
                </button>
              ))
            )}
          </div>
          {alerts.length > 0 && (
            <button
              onClick={() => {
                setNotifOpen(false);
                navigate("/inventory");
              }}
              className="block w-full border-t border-brand-100 px-4 py-2.5 text-center text-sm font-medium text-brand-600 hover:bg-brand-50"
            >
              View inventory
            </button>
          )}
        </Dropdown>
      </div>

      {/* Profile */}
      <div className="relative">
        <button className="flex items-center gap-2 rounded-lg p-1 pr-2 transition hover:bg-brand-50" onClick={() => setProfileOpen((o) => !o)}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-900 text-xs font-semibold text-white">OP</span>
          <ChevronDown className="hidden h-4 w-4 text-brand-400 sm:block" />
        </button>
        <Dropdown open={profileOpen} onClose={() => setProfileOpen(false)}>
          <div className="border-b border-brand-100 px-4 py-3">
            <p className="text-sm font-semibold text-brand-800">Operations</p>
            <p className="text-xs text-brand-400">ops@stockpilot.app</p>
          </div>
          <div className="p-1.5">
            <button className="menu-item">Workspace settings</button>
            <button className="menu-item">API &amp; docs</button>
            <button className="menu-item text-rose-600 hover:bg-rose-50">Sign out</button>
          </div>
        </Dropdown>
      </div>
    </header>
  );
}
