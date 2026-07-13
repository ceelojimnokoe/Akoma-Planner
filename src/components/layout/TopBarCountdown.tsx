// src/components/layout/TopBarCountdown.tsx
//
// TopBar.tsx renders on every page, but the dashboard already shows this
// same countdown via its own "Wedding countdown" StatCard — so this
// hides itself specifically on /dashboard to avoid the duplicate,
// keeping the full "X days to go · City" text everywhere else where
// it's the only countdown on screen. A small client leaf (same
// usePathname() pattern Sidebar.tsx already uses for active-link
// highlighting) rather than making all of TopBar client-side, so its
// own async notification fetch stays server-side.

"use client";

import { usePathname } from "next/navigation";

export function TopBarCountdown({ days, city }: { days: number; city: string }) {
  const pathname = usePathname();
  const onDashboard = pathname === "/dashboard";

  return (
    <p className="text-sm text-akoma-ink/60">
      {!onDashboard && <>{days >= 0 ? `${days} day${days === 1 ? "" : "s"} to go` : "Wedding day has passed"} · </>}
      {city}
    </p>
  );
}
