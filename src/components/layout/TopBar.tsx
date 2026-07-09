// src/components/layout/TopBar.tsx
//
// Slim header shown above every page inside the app shell: which wedding
// you're looking at, the countdown, and the current plan. Plain
// server-renderable component — no client state needed, it just displays
// whatever the layout fetched.

import type { WeddingPlan } from "@prisma/client";
import { LinkButton } from "@/components/ui/Button";
import { Badge, ProBadge } from "@/components/ui/Badge";
import { daysUntil } from "@/lib/dates";

export function TopBar({ weddingPlan }: { weddingPlan: WeddingPlan }) {
  const days = daysUntil(weddingPlan.weddingDate);

  return (
    <header className="flex items-center justify-between border-b border-akoma-ink/10 bg-white px-6 py-4">
      <div>
        <h1 className="font-semibold text-akoma-ink">{weddingPlan.coupleNames}</h1>
        <p className="text-sm text-akoma-ink/60">
          {days >= 0 ? `${days} day${days === 1 ? "" : "s"} to go` : "Wedding day has passed"} ·{" "}
          {weddingPlan.city.charAt(0) + weddingPlan.city.slice(1).toLowerCase()}
        </p>
      </div>
      <div className="flex items-center gap-3">
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
