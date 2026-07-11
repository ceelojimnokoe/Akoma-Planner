// src/components/ui/ToastProvider.tsx
//
// A small, dependency-free toast system — nothing like this existed
// anywhere in the app before the budget alerts needed one (see
// BudgetAlertWatcher.tsx). Mounted once in (app)/layout.tsx, exposes
// useToast() to any client component underneath. Renders top-right,
// deliberately not bottom-right — the FloatingChatBubble already lives
// there, and stacking notifications on top of a chat launcher is the
// kind of collision worth avoiding on purpose rather than by accident.

"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import Link from "next/link";

type ToastTone = "info" | "warning" | "danger";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  actionLabel?: string;
  actionHref?: string;
}

type ShowToastInput = Omit<Toast, "id">;

const ToastContext = createContext<((toast: ShowToastInput) => void) | null>(null);

const TONE_CLASSES: Record<ToastTone, string> = {
  info: "border-akoma-green/30 bg-white",
  warning: "border-akoma-gold/40 bg-akoma-gold/5",
  danger: "border-akoma-terracotta/40 bg-akoma-terracotta/5",
};

const TONE_DOT: Record<ToastTone, string> = {
  info: "bg-akoma-green",
  warning: "bg-akoma-gold",
  danger: "bg-akoma-terracotta",
};

const AUTO_DISMISS_MS = 10_000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((toast: ShowToastInput) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), AUTO_DISMISS_MS);
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {/* top-20, not top-4: the app shell's TopBar (couple name, plan
          badge, Upgrade button) occupies the top ~4.5rem of every page —
          top-4 rendered toasts directly on top of the Upgrade button,
          only caught by actually looking at a screenshot, not by any
          text-based check. */}
      <div className="fixed left-4 right-4 top-20 z-50 flex flex-col gap-2 sm:left-auto sm:w-full sm:max-w-sm">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-start gap-2.5 rounded-xl border p-3 shadow-lg ${TONE_CLASSES[t.tone]}`}>
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[t.tone]}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-akoma-ink">{t.message}</p>
              {t.actionLabel && t.actionHref && (
                <Link href={t.actionHref} className="mt-1 inline-block text-sm font-medium text-akoma-green hover:underline">
                  {t.actionLabel} →
                </Link>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-akoma-ink/40 hover:text-akoma-ink"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error("useToast must be used within a ToastProvider");
  return showToast;
}
