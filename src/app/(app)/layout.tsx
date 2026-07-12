// src/app/(app)/layout.tsx
//
// Layout for every "inside the product" page (dashboard, budget,
// checklist, etc — everything in this route group). Nested inside the
// root layout. Fetches the current wedding plan once, server-side, and
// redirects to onboarding if the (stubbed) current user doesn't have one
// yet — every page below this layout can assume a wedding plan exists.
//
// force-dynamic matters here: none of these pages read cookies/headers/
// searchParams (the usual signals Next.js uses to decide a route needs
// per-request rendering), so without this, `next build` would statically
// prerender the dashboard/budget/checklist/etc. ONCE using whatever data
// existed at build time and serve that same frozen snapshot to every
// visitor forever — never reflecting a single edit made afterward. Caught
// this by actually running `next build` and reading its route summary
// (○ Static vs ƒ Dynamic), not by assumption. See LEARNING.md.

import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentWeddingPlan } from "@/lib/session";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { FloatingChatBubble } from "@/components/bisaai/FloatingChatBubble";
import { ToastProvider } from "@/components/ui/ToastProvider";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, weddingPlan] = await Promise.all([getCurrentUser(), getCurrentWeddingPlan()]);
  if (!weddingPlan) redirect("/onboarding");

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar user={user} hasWeddingPass={weddingPlan.hasWeddingPass} />
        <div className="flex flex-1 flex-col">
          <TopBar weddingPlan={weddingPlan} user={user} />
          {/* Extra bottom padding reserves room for the floating chat bubble
              (see FloatingChatBubble.tsx) so it doesn't sit on top of the
              last section of page content. Reserving *horizontal* space
              here too was tried and reverted — it shrank the dashboard's
              top stat-card row enough to trigger StatCard's own truncate
              behavior ("Budget spent" -> "GH..."). Right-side clearance
              for the handful of pages/sections actually at risk (a
              right-hand card in a multi-column row landing under the
              bubble) is instead reserved locally on just those sections —
              see the pr-20/pr-14 comments in dashboard/page.tsx,
              accommodation/page.tsx, and bisaai/page.tsx. */}
          <main className="flex-1 bg-akoma-cream p-6 pb-24">{children}</main>
        </div>
        {/* Mounted once here so it persists (collapsed by default) across
            every page in the app shell, not just the dedicated /bisaai page. */}
        <FloatingChatBubble weddingPlanId={weddingPlan.id} />
      </div>
    </ToastProvider>
  );
}
