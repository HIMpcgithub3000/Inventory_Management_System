// Small shared presentational helpers.
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12 text-slate-400">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
    </div>
  );
}

export function EmptyState({ title, hint }) {
  return (
    <div className="py-12 text-center text-slate-400">
      <p className="font-medium text-slate-500">{title}</p>
      {hint && <p className="mt-1 text-sm">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div className="card border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      Failed to load: {message}
    </div>
  );
}

export function Field({ label, error, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
