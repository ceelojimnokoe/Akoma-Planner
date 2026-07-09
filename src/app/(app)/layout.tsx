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
import { getCurrentWeddingPlan } from "@/lib/session";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const weddingPlan = await getCurrentWeddingPlan();
  if (!weddingPlan) redirect("/onboarding");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <TopBar weddingPlan={weddingPlan} />
        <main className="flex-1 bg-akoma-cream p-6">{children}</main>
      </div>
    </div>
  );
}
