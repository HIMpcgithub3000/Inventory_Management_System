import { useState } from "react";
import { useCustomers, useCreateCustomer, useDeleteCustomer } from "../api/hooks";
import { errorMessage } from "../api/client";
import { useToast } from "../components/Toast";
import Modal from "../components/Modal";
import { EmptyState, ErrorState, Field, Spinner } from "../components/ui";

const blank = { full_name: "", email: "", phone: "" };
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form) {
  const e = {};
  if (!form.full_name.trim()) e.full_name = "Name is required";
  if (!emailRe.test(form.email)) e.email = "Enter a valid email";
  return e;
}

export default function Customers() {
  const toast = useToast();
  const { data, isLoading, isError, error } = useCustomers();
  const createM = useCreateCustomer();
  const deleteM = useDeleteCustomer();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [errs, setErrs] = useState({});

  const openCreate = () => {
    setForm(blank);
    setErrs({});
    setOpen(true);
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate(form);
    setErrs(e);
    if (Object.keys(e).length) return;
    try {
      await createM.mutateAsync({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
      });
      toast.success("Customer created");
      setOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (c) => {
    if (!confirm(`Delete customer "${c.full_name}"?`)) return;
    try {
      await deleteM.mutateAsync(c.id);
      toast.success("Customer deleted");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">Manage your customer directory.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          + Add customer
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
          <EmptyState title="No customers yet" hint="Add your first customer." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">{c.full_name}</td>
                    <td className="px-4 py-3 text-slate-500">{c.email}</td>
                    <td className="px-4 py-3 text-slate-500">{c.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button className="btn-danger px-3 py-1" onClick={() => remove(c)}>
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

      <Modal open={open} title="Add customer" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Full name" error={errs.full_name}>
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </Field>
          <Field label="Email" error={errs.email}>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Phone (optional)">
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={createM.isPending}>
              Create customer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
