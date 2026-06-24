import { useNavigate } from "react-router-dom";
import { Package, Users, ShoppingCart, AlertTriangle, Plus, ArrowRight, TrendingUp, Boxes } from "lucide-react";
import { useStats, useProducts, useOrders } from "../api/hooks";
import { errorMessage } from "../api/client";
import { useLookups } from "../lib/lookups";
import { money, dateShort, relativeTime } from "../lib/format";
import { stockStatus } from "../lib/status";
import { Avatar, OrderStatusBadge, CenterSpinner, ErrorState, SectionHeader, Spinner } from "../components/ui";
import { Donut, BarList } from "../components/Charts";

function Kpi({ icon: Icon, label, value, tone, foot, onClick }) {
  const tones = {
    slate: "bg-brand-50 text-brand-600",
    emerald: "bg-stock-50 text-stock-600",
    indigo: "bg-indigo-50 text-indigo-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <button onClick={onClick} className="card group p-5 text-left transition hover:shadow-pop">
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className="h-4 w-4 text-brand-200 transition group-hover:translate-x-0.5 group-hover:text-brand-400" />
      </div>
      <p className="tnum mt-4 text-3xl font-bold text-brand-900">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-brand-500">{label}</p>
      {foot && <p className="mt-1 text-xs text-brand-400">{foot}</p>}
    </button>
  );
}

export default function Dashboard({ onNewOrder }) {
  const navigate = useNavigate();
  const stats = useStats();
  const { data: products = [] } = useProducts();
  const orders = useOrders();
  const { customerById } = useLookups();

  if (stats.isLoading) return <CenterSpinner label="Loading dashboard…" />;
  if (stats.isError) return <ErrorState message={errorMessage(stats.error)} onRetry={stats.refetch} />;

  const s = stats.data;
  const threshold = s.low_stock_threshold;
  const out = products.filter((p) => p.quantity_in_stock <= 0).length;
  const low = products.filter((p) => p.quantity_in_stock > 0 && p.quantity_in_stock < threshold).length;
  const healthy = products.length - low - out;
  const inventoryValue = products.reduce((sum, p) => sum + Number(p.price) * p.quantity_in_stock, 0);

  const lowStockList = products
    .filter((p) => p.quantity_in_stock < threshold)
    .sort((a, b) => a.quantity_in_stock - b.quantity_in_stock)
    .slice(0, 5);
  const topStock = [...products].sort((a, b) => b.quantity_in_stock - a.quantity_in_stock).slice(0, 5);
  const recentOrders = [...(orders.data || [])].slice(0, 6);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={Package} label="Products" value={s.total_products} tone="slate" foot={`${money(inventoryValue)} stock value`} onClick={() => navigate("/products")} />
        <Kpi icon={Users} label="Customers" value={s.total_customers} tone="indigo" foot="Active directory" onClick={() => navigate("/customers")} />
        <Kpi icon={ShoppingCart} label="Orders" value={s.total_orders} tone="emerald" foot="All-time placed" onClick={() => navigate("/orders")} />
        <Kpi icon={AlertTriangle} label="Low stock" value={s.low_stock_count} tone={s.low_stock_count ? "rose" : "emerald"} foot={`Below ${threshold} units`} onClick={() => navigate("/inventory")} />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2.5">
        <button className="btn-accent" onClick={onNewOrder}><Plus className="h-4 w-4" /> New order</button>
        <button className="btn-ghost" onClick={() => navigate("/products?new=1")}><Package className="h-4 w-4" /> Add product</button>
        <button className="btn-ghost" onClick={() => navigate("/customers?new=1")}><Users className="h-4 w-4" /> Add customer</button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-brand-100 p-4">
            <SectionHeader title="Recent orders" subtitle="Latest activity across your store" />
            <button onClick={() => navigate("/orders")} className="btn-ghost px-2.5 py-1.5 text-xs">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {orders.isLoading ? (
            <CenterSpinner />
          ) : recentOrders.length === 0 ? (
            <p className="p-10 text-center text-sm text-brand-400">No orders yet. Create your first order to see it here.</p>
          ) : (
            <div className="divide-y divide-brand-50">
              {recentOrders.map((o) => {
                const c = customerById[o.customer_id];
                return (
                  <button key={o.id} onClick={() => navigate(`/orders?focus=${o.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left row-hover">
                    <Avatar name={c?.full_name || "Unknown"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-brand-800">{c?.full_name || "Unknown customer"}</p>
                      <p className="text-xs text-brand-400">{relativeTime(o.created_at)} · {o.lines?.length || 0} item{(o.lines?.length || 0) !== 1 ? "s" : ""}</p>
                    </div>
                    <OrderStatusBadge status={o.status} />
                    <span className="tnum w-20 text-right text-sm font-semibold text-brand-900">{money(o.total_amount)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Inventory health */}
        <div className="card p-5">
          <SectionHeader title="Inventory health" subtitle={`${products.length} products tracked`} />
          <div className="my-4 flex justify-center">
            <Donut
              total={products.length}
              centerLabel="products"
              segments={[
                { label: "Healthy", value: healthy < 0 ? 0 : healthy, tone: "emerald" },
                { label: "Low", value: low, tone: "amber" },
                { label: "Out", value: out, tone: "rose" },
              ]}
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-500">
            <TrendingUp className="h-4 w-4 text-stock-600" />
            <span className="tnum font-semibold text-brand-700">{money(inventoryValue)}</span> total stock value
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low stock alerts */}
        <div className="card p-5">
          <SectionHeader
            title="Low stock alerts"
            subtitle="Replenish these soon"
            action={
              <button onClick={() => navigate("/inventory")} className="btn-ghost px-2.5 py-1.5 text-xs">
                Manage <ArrowRight className="h-3.5 w-3.5" />
              </button>
            }
          />
          <div className="mt-4">
            {lowStockList.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-stock-50 px-3 py-3 text-sm text-stock-700">
                <Boxes className="h-4 w-4" /> All products are well stocked.
              </div>
            ) : (
              <div className="space-y-1">
                {lowStockList.map((p) => {
                  const st = stockStatus(p.quantity_in_stock, threshold);
                  return (
                    <div key={p.id} className="flex items-center gap-3 rounded-lg px-2 py-2 row-hover">
                      <span className={`h-2 w-2 rounded-full ${st.key === "out" ? "bg-rose-500" : "bg-amber-500"}`} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-700">{p.name}</span>
                      <span className="text-xs text-brand-400">{p.sku}</span>
                      <span className={`tnum w-10 text-right text-sm font-semibold ${st.key === "out" ? "text-rose-600" : "text-amber-600"}`}>{p.quantity_in_stock}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top stock */}
        <div className="card p-5">
          <SectionHeader title="Top products by stock" subtitle="Highest on-hand quantities" />
          <div className="mt-4">
            {topStock.length === 0 ? (
              <p className="py-6 text-center text-sm text-brand-400">No products yet.</p>
            ) : (
              <BarList items={topStock.map((p) => ({ label: p.name, value: p.quantity_in_stock, tone: stockStatus(p.quantity_in_stock, threshold).tone, sub: "units" }))} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
