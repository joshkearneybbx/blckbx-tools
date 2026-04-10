import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "../lib/utils";

type ToastItem = {
  id: string;
  title: string;
  tone: "success" | "error";
};

type ToastContextValue = {
  showToast: (title: string, tone: ToastItem["tone"]) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((title: string, tone: ToastItem["tone"]) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, title, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[320px] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto overflow-hidden border border-[var(--border)] bg-white"
          >
            <div
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm",
                toast.tone === "success" ? "border-l-4 border-[var(--success)]" : "border-l-4 border-[var(--error)]",
              )}
            >
              <span className="font-medium">{toast.title}</span>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
