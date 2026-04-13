import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";

export type ToastType = "success" | "error" | "info";

/**
 * Global toast function callable from non-React code (e.g., retry utility).
 * Set by ToastProvider on mount.
 */
let _globalToast: ((message: string, type?: ToastType) => void) | null = null;

export function showGlobalToast(message: string, type: ToastType = "info") {
  if (_globalToast) _globalToast(message, type);
}

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

type ToastContextValue = {
  toasts: ToastItem[];
  toast: (message: string, type?: ToastType) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 3800;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextToastIdRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = nextToastIdRef.current;
      nextToastIdRef.current += 1;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss]
  );

  // Register global toast so non-React code can fire toasts
  useEffect(() => {
    _globalToast = toast;
    return () => { _globalToast = null; };
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      role="region"
      aria-label="Notifications"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: "min(360px, calc(100vw - 48px))",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            padding: "14px 18px",
            borderRadius: 10,
            background: "var(--surface-white, #fff)",
            border: "1px solid var(--border-default, rgba(0,0,0,0.1))",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            fontFamily: "var(--font)",
            fontSize: 14,
            color: "var(--text-primary, #1a1a1a)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            animation: "toastSlideIn 0.25s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {t.type === "success" && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--gold-dark)",
                flexShrink: 0,
              }}
            />
          )}
          {t.type === "error" && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--danger, #D64545)",
                flexShrink: 0,
              }}
            />
          )}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
            style={{
              background: "none",
              border: "none",
              padding: 4,
              cursor: "pointer",
              color: "var(--fg-3)",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      ))}
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toast: () => {}, dismiss: () => {}, toasts: [] };
  return ctx;
}
