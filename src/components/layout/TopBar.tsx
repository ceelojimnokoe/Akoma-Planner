// src/components/layout/TopBar.tsx
//
// Header shown above every page inside the app shell: which wedding you're
// looking at, the countdown, the current plan, and notifications. An
// async Server Component (Next.js allows this anywhere, not just
// page.tsx) — it syncs the computed notifications (see
// lib/notifications.ts) fresh on every render, then hands the resulting
// list to NotificationBell.tsx, a client component, for the interactive
// dropdown/mark-as-read part.

import type { WeddingPlan } from "@prisma/client";
import { LinkButton } from "@/components/ui/Button";
import { Badge, PassBadge } from "@/components/ui/Badge";
import { daysUntil } from "@/lib/dates";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import type { SidebarUser } from "@/components/layout/Sidebar";
import { syncComputedNotifications, getRecentNotifications } from "@/lib/notifications";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { TopBarCountdown } from "@/components/layout/TopBarCountdown";

export async function TopBar({ weddingPlan, user }: { weddingPlan: WeddingPlan; user: SidebarUser }) {
  const days = daysUntil(weddingPlan.weddingDate);

  await syncComputedNotifications(weddingPlan.id);
  const { notifications, unreadCount } = await getRecentNotifications(weddingPlan.id);

  return (
    <header className="flex items-center justify-between border-b border-akoma-ink/10 bg-white px-4 py-4 sm:px-6">
      <div className="flex items-center gap-2">
        <MobileNavDrawer user={user} hasWeddingPass={weddingPlan.hasWeddingPass} />
        <div>
          <h1 className="font-semibold text-akoma-ink">{weddingPlan.coupleNames}</h1>
          <TopBarCountdown days={days} city={weddingPlan.city.charAt(0) + weddingPlan.city.slice(1).toLowerCase()} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div data-tour="notifications">
          <NotificationBell weddingPlanId={weddingPlan.id} initialNotifications={notifications} initialUnreadCount={unreadCount} />
        </div>
        {weddingPlan.hasWeddingPass ? (
          <PassBadge />
        ) : (
          <>
            <Badge tone="neutral">Free plan</Badge>
            <LinkButton href="/pricing" size="sm" variant="secondary">
              Get the Wedding Pass
            </LinkButton>
          </>
        )}
      </div>
    </header>
  );
}
