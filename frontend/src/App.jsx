import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Orders from "./pages/Orders";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: "▦" },
  { to: "/products", label: "Products", icon: "▣" },
  { to: "/customers", label: "Customers", icon: "☻" },
  { to: "/orders", label: "Orders", icon: "▤" },
];

export default function App() {
  const [open, setOpen] = useState(false);

  const NavItems = ({ onClick }) =>
    nav.map((n) => (
      <NavLink
        key={n.to}
        to={n.to}
        onClick={onClick}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
            isActive ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`
        }
      >
        <span className="text-base">{n.icon}</span>
        {n.label}
      </NavLink>
    ));

  return (
    <div className="min-h-screen lg:flex">
      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <span className="text-lg font-bold text-brand-700">IOMS</span>
        <button className="btn-ghost px-3 py-1" onClick={() => setOpen((o) => !o)}>
          ☰
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`${open ? "block" : "hidden"} border-b border-slate-200 bg-white p-4 lg:block lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r`}
      >
        <div className="mb-6 hidden items-center gap-2 px-2 lg:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
            IO
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">IOMS</p>
            <p className="text-xs text-slate-400">Inventory & Orders</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          <NavItems onClick={() => setOpen(false)} />
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
