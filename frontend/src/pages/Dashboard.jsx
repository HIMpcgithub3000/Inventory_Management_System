import { useProducts, useStats } from "../api/hooks";
import { errorMessage } from "../api/client";
import { ErrorState, Spinner } from "../components/ui";
import { money } from "../lib/format";

function StatCard({ label, value, accent }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent || "text-slate-900"}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const stats = useStats();
  const products = useProducts();

  if (stats.isLoading) return <Spinner />;
  if (stats.isError) return <ErrorState message={errorMessage(stats.error)} />;

  const s = stats.data;
  const threshold = s.low_stock_threshold;
  const lowStock = (products.data || [])
    .filter((p) => p.quantity_in_stock < threshold)
    .sort((a, b) => a.quantity_in_stock - b.quantity_in_stock);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Live summary of your inventory and orders.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Products" value={s.total_products} />
        <StatCard label="Total Customers" value={s.total_customers} />
        <StatCard label="Total Orders" value={s.total_orders} />
        <StatCard
          label={`Low Stock (< ${threshold})`}
          value={s.low_stock_count}
          accent={s.low_stock_count > 0 ? "text-rose-600" : "text-emerald-600"}
        />
      </div>

      <div className="card">
        <div className="border-b border-slate-100 p-4">
          <h2 className="font-semibold text-slate-900">Low-stock products</h2>
          <p className="text-sm text-slate-500">Products below the reorder threshold of {threshold}.</p>
        </div>
        {products.isLoading ? (
          <Spinner />
        ) : lowStock.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">All products are well stocked. 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">In stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStock.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 text-slate-500">{p.sku}</td>
                    <td className="px-4 py-3">{money(p.price)}</td>
                    <td className="px-4 py-3">
                      <span className="badge bg-rose-100 text-rose-700">{p.quantity_in_stock}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
