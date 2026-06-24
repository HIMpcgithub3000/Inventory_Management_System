import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, subtitle, footer, size = "max-w-lg", children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-brand-900/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full ${size} animate-scale-in rounded-t-2xl bg-white shadow-pop sm:rounded-2xl`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-brand-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-brand-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-brand-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn-icon" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
        {footer && <footer className="border-t border-brand-100 px-5 py-3">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

// Lightweight confirm dialog used for destructive actions.
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", danger, busy }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="max-w-md"
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-brand-600">{message}</p>
    </Modal>
  );
}
