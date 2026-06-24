import { createContext, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

let counter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (message, type) => {
      const id = ++counter;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );
  const toast = {
    success: (m) => push(m, "success"),
    error: (m) => push(m, "error"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2"
        >
          {toasts.map((t) => {
            const ok = t.type === "success";
            const Icon = ok ? CheckCircle2 : AlertCircle;
            return (
              <div
                key={t.id}
                className={`pointer-events-auto flex animate-slide-up items-start gap-3 rounded-xl border bg-white p-3.5 shadow-pop ${
                  ok ? "border-stock-100" : "border-rose-100"
                }`}
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ok ? "text-stock-600" : "text-rose-600"}`} />
                <p className="flex-1 text-sm text-brand-700">{t.message}</p>
                <button onClick={() => dismiss(t.id)} className="text-brand-300 transition hover:text-brand-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
