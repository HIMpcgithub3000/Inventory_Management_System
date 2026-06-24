import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import CommandPalette from "./components/CommandPalette";
import OrderWizard from "./pages/OrderWizard";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";

const META = {
  "/dashboard": { title: "Dashboard", subtitle: "Your operations at a glance" },
  "/products": { title: "Products", subtitle: "Manage your catalog and pricing" },
  "/inventory": { title: "Inventory", subtitle: "Monitor stock health across products" },
  "/orders": { title: "Orders", subtitle: "Track and fulfill customer orders" },
  "/customers": { title: "Customers", subtitle: "Your customer directory" },
};

export default function App() {
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const meta = META[pathname] || { title: "Stockpilot" };

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const newOrder = () => setWizardOpen(true);

  return (
    <div className="flex min-h-dvh bg-brand-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onNewOrder={newOrder} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          onMenu={() => setSidebarOpen(true)}
          onOpenSearch={() => setPaletteOpen(true)}
        />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-7xl">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard onNewOrder={newOrder} />} />
              <Route path="/products" element={<Products />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/orders" element={<Orders onNewOrder={newOrder} />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNewOrder={newOrder} />
      <OrderWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
