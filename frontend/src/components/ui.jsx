import { Loader2, PackageOpen, AlertTriangle } from "lucide-react";
import { TONES, stockStatus, orderStatusMeta } from "../lib/status";
import { initials, avatarColor } from "../lib/format";

// ---------- Badges ----------
export function Badge({ tone = "slate", dot = false, children, className = "" }) {
  const t = TONES[tone] || TONES.slate;
  return (
    <span className={`badge ${t.badge} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />}
      {children}
    </span>
  );
}

export function StockBadge({ qty, threshold }) {
  const s = stockStatus(qty, threshold);
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

export function OrderStatusBadge({ status }) {
  const m = orderStatusMeta[status] || { label: status, tone: "slate" };
  return (
    <Badge tone={m.tone} dot>
      {m.label}
    </Badge>
  );
}

// ---------- Avatar ----------
export function Avatar({ name, size = "md" }) {
  const dim = size === "lg" ? "h-12 w-12 text-base" : size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${dim} ${avatarColor(name)}`}>
      {initials(name)}
    </span>
  );
}

// ---------- States ----------
export function Spinner({ className = "h-5 w-5" }) {
  return <Loader2 className={`animate-spin text-brand-400 ${className}`} />;
}

export function CenterSpinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-brand-400">
      <Spinner className="h-6 w-6" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon = PackageOpen, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-300">
        <Icon className="h-7 w-7" />
      </div>
      <p className="text-base font-semibold text-brand-700">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-brand-400">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="m-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">Couldn’t load data</p>
        <p className="mt-0.5 text-rose-600">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-2 font-medium text-rose-700 underline underline-offset-2">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Skeletons ----------
export function SkeletonRows({ rows = 6, cols = 4 }) {
  return (
    <div className="divide-y divide-brand-50">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton h-4" style={{ width: c === 0 ? "30%" : `${14 + ((r + c) % 3) * 6}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------- Form field ----------
export function Field({ label, required, error, hint, children }) {
  return (
    <div>
      {label && (
        <label className="label">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-brand-400">{hint}</p>
      ) : null}
    </div>
  );
}

// ---------- Progress bar ----------
export function ProgressBar({ value, tone = "emerald", className = "" }) {
  const t = TONES[tone] || TONES.emerald;
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-brand-100 ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${t.bar}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

// ---------- Section header ----------
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-brand-800">{title}</h2>
        {subtitle && <p className="text-xs text-brand-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
