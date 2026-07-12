// src/components/tour/GuidedTourController.tsx
//
// Mounted once in (app)/layout.tsx, alongside Sidebar/TopBar — not on
// dashboard/page.tsx alone — because most tour steps highlight elements
// that live in the persistent layout shell (Sidebar nav links, the
// notification bell), not the dashboard page's own content. Only
// auto-opens on /dashboard, which is naturally "the first time this
// account ever reaches the dashboard" for a genuinely new account, since
// that page is only ever reached via /onboarding/complete beforehand —
// no separate "is this a first-time user" tracking needed beyond the one
// hasCompletedTour flag. Restarting from Settings works the same way:
// flip the flag, navigate to /dashboard, this component sees
// hasCompletedTour: false again on the next server-fetched prop.

"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { markTourCompleted } from "@/server/actions/tour";
import { TourOverlay } from "@/components/tour/TourOverlay";

export function GuidedTourController({ hasCompletedTour }: { hasCompletedTour: boolean }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (pathname === "/dashboard" && !hasCompletedTour) {
      setIsOpen(true);
    }
    // Deliberately excludes hasCompletedTour from deps beyond the initial
    // check — once open, later prop refreshes (e.g. an unrelated
    // navigation re-render) shouldn't silently reopen or close it out
    // from under the user; only the finish/skip handler closes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function handleFinish() {
    // Closes immediately from local state — doesn't wait on the round
    // trip below, so there's no risk of it lingering open (or the
    // server re-render racing the close, see tour.ts's own comment on
    // why this action skips revalidatePath entirely).
    setIsOpen(false);
    startTransition(() => {
      markTourCompleted();
    });
  }

  if (!isOpen) return null;

  return <TourOverlay onFinish={handleFinish} />;
}
