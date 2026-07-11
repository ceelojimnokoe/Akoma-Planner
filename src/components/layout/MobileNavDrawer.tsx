// src/components/layout/MobileNavDrawer.tsx
//
// The Sidebar is `hidden ... sm:flex` — real, with no mobile equivalent
// anywhere before this. This is that equivalent: a hamburger button
// (mobile-only) that opens the exact same nav (SidebarContent, shared
// with Sidebar.tsx) as a slide-in drawer.

"use client";

import { useEffect, useState } from "react";
import { SidebarContent, type SidebarUser } from "@/components/layout/Sidebar";

export function MobileNavDrawer({ user, plan }: { user: SidebarUser; plan: "FREE" | "PRO" }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="rounded-lg p-2 text-akoma-ink/70 hover:bg-akoma-ink/5 sm:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        // z-[60], above ToastProvider's z-50: an explicit user action
        // (opening the nav) should win over a passive background toast —
        // caught by actually screenshotting the drawer open with a toast
        // active, not by any text-based check.
        <div className="fixed inset-0 z-[60] sm:hidden">
          <div className="absolute inset-0 bg-akoma-ink/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl" role="dialog" aria-modal="true" aria-label="Navigation">
            <SidebarContent user={user} plan={plan} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
