"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  addToast: (message: string, variant?: ToastVariant) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

const DISMISS_MS = 3500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Use a counter so each ID is unique even when React strict mode fires twice
  const counter = useRef(0);

  const addToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = `toast-${++counter.current}`;
    setToasts((cur) => [...cur, { id, message, variant }]);
    setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((c) => c.filter((t) => t.id !== id))} />
    </ToastContext.Provider>
  );
}

// ── Stack UI ──────────────────────────────────────────────────────────────────

const VARIANT_BORDER: Record<ToastVariant, string> = {
  success: "border-l-4 border-l-green-500",
  error: "border-l-4 border-l-red-500",
  info: "border-l-4 border-l-indigo-500",
};

const VARIANT_ICON: Record<ToastVariant, string> = {
  success: "✓",
  error: "✕",
  info: "i",
};

const VARIANT_ICON_COLOR: Record<ToastVariant, string> = {
  success: "text-green-600",
  error: "text-red-600",
  info: "text-indigo-600",
};

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      role="alert"
      className={[
        "flex w-80 items-start gap-3 rounded-lg bg-white px-4 py-3 shadow-lg",
        "dark:bg-zinc-900 dark:shadow-zinc-950",
        VARIANT_BORDER[toast.variant],
        "transition-all duration-300",
        visible ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
      ].join(" ")}
    >
      <span
        className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${VARIANT_ICON_COLOR[toast.variant]}`}
      >
        {VARIANT_ICON[toast.variant]}
      </span>
      <p className="flex-1 text-sm text-zinc-800 dark:text-zinc-200">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="shrink-0 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
      >
        ×
      </button>
    </div>
  );
}
