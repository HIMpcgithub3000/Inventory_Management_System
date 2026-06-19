import { useState } from "react";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "../api/hooks";
import { errorMessage } from "../api/client";
import { useToast } from "../components/Toast";
import Modal from "../components/Modal";
import { EmptyState, ErrorState, Field, Spinner } from "../components/ui";
import { money } from "../lib/format";

const blank = { name: "", sku: "", price: "", quantity_in_stock: "" };

function validate(form) {
  const e = {};
  if (!form.name.trim()) e.name = "Name is required";
  if (!form.sku.trim()) e.sku = "SKU is required";
  if (form.price === "" || Number(form.price) < 0) e.price = "Price must be ≥ 0";
  if (form.quantity_in_stock === "" || Number(form.quantity_in_stock) < 0 || !Number.isInteger(Number(form.quantity_in_stock)))
    e.quantity_in_stock = "Quantity must be a whole number ≥ 0";
  return e;
}

export default function Products() {
  const toast = useToast();
  const { data, isLoading, isError, error } = useProducts();
  const createM = useCreateProduct();
  const updateM = useUpdateProduct();
  const deleteM = useDeleteProduct();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [errs, setErrs] = useState({});

  const openCreate = () => {
    setEditing(null);
    setForm(blank);
    setErrs({});
    setOpen(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, sku: p.sku, price: p.price, quantity_in_stock: p.quantity_in_stock });
    setErrs({});
    setOpen(true);
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate(form);
    setErrs(e);
    if (Object.keys(e).length) return;
    const body = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: String(form.price),
      quantity_in_stock: Number(form.quantity_in_stock),
    };
    try {
      if (editing) {
        await updateM.mutateAsync({ id: editing.id, body });
        toast.success("Product updated");
      } else {
        await createM.mutateAsync(body);
        toast.success("Product created");
      }
      setOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (p) => {
    if (!confirm(`Delete product "${p.name}"?`)) return;
    try {
      await deleteM.mutateAsync(p.id);
      toast.success("Product deleted");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">Manage your catalog and stock levels.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          + Add product
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <Spinner />
        ) : isError ? (
          <div className="p-4">
            <ErrorState message={errorMessage(error)} />
          </div>
        ) : data.length === 0 ? (
          <EmptyState title="No products yet" hint="Add your first product to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 text-slate-500">{p.sku}</td>
                    <td className="px-4 py-3">{money(p.price)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${
                          p.quantity_in_stock === 0
                            ? "bg-rose-100 text-rose-700"
                            : p.quantity_in_stock < 10
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {p.quantity_in_stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button className="btn-ghost px-3 py-1" onClick={() => openEdit(p)}>
                          Edit
                        </button>
                        <button className="btn-danger px-3 py-1" onClick={() => remove(p)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} title={editing ? "Edit product" : "Add product"} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Product name" error={errs.name}>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="SKU / Code" error={errs.sku}>
            <input
              className="input"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price" error={errs.price}>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </Field>
            <Field label="Quantity in stock" error={errs.quantity_in_stock}>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                value={form.quantity_in_stock}
                onChange={(e) => setForm({ ...form, quantity_in_stock: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={createM.isPending || updateM.isPending}>
              {editing ? "Save changes" : "Create product"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
