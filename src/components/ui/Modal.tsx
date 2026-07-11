// src/components/ui/Modal.tsx
//
// First modal/dialog primitive in the app — needed for the guest-import
// preview (a file picker + a data table doesn't fit in an inline form the
// way every other "add a thing" flow in this app has so far). Plain
// fixed-overlay + centered panel, no portal library: Next.js Client
// Components can render fixed-position elements from wherever they're
// mounted without needing React portals for this to look right.

"use client";

import { useEffect } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-akoma-ink/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-akoma-ink/10 px-5 py-4">
          <h2 className="font-semibold text-akoma-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-akoma-ink/40 hover:text-akoma-ink">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
