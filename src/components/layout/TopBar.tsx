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
import { Badge, ProBadge } from "@/components/ui/Badge";
import { daysUntil } from "@/lib/dates";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import type { SidebarUser } from "@/components/layout/Sidebar";
import { syncComputedNotifications, getRecentNotifications } from "@/lib/notifications";
import { NotificationBell } from "@/components/layout/NotificationBell";

export async function TopBar({ weddingPlan, user }: { weddingPlan: WeddingPlan; user: SidebarUser }) {
  const days = daysUntil(weddingPlan.weddingDate);

  await syncComputedNotifications(weddingPlan.id);
  const { notifications, unreadCount } = await getRecentNotifications(weddingPlan.id);

  return (
    <header className="flex items-center justify-between border-b border-akoma-ink/10 bg-white px-4 py-4 sm:px-6">
      <div className="flex items-center gap-2">
        <MobileNavDrawer user={user} plan={weddingPlan.plan} />
        <div>
          <h1 className="font-semibold text-akoma-ink">{weddingPlan.coupleNames}</h1>
          <p className="text-sm text-akoma-ink/60">
            {days >= 0 ? `${days} day${days === 1 ? "" : "s"} to go` : "Wedding day has passed"} ·{" "}
            {weddingPlan.city.charAt(0) + weddingPlan.city.slice(1).toLowerCase()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell weddingPlanId={weddingPlan.id} initialNotifications={notifications} initialUnreadCount={unreadCount} />
        {weddingPlan.plan === "PRO" ? (
          <ProBadge />
        ) : (
          <>
            <Badge tone="neutral">Free plan</Badge>
            <LinkButton href="/pricing" size="sm" variant="secondary">
              Upgrade to Pro
            </LinkButton>
          </>
        )}
      </div>
    </header>
  );
}
