import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function Drawer({ open, onClose, title, subtitle, badge, footer, width = "max-w-xl", children }) {
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
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-brand-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute right-0 top-0 flex h-full w-full ${width} animate-slide-in-right flex-col bg-brand-50 shadow-drawer`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-brand-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-brand-900">{title}</h2>
              {badge}
            </div>
            {subtitle && <p className="mt-0.5 truncate text-sm text-brand-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn-icon" aria-label="Close panel">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="border-t border-brand-100 bg-white px-5 py-3">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}
