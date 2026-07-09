// src/app/onboarding/page.tsx
//
// Wedding setup entry point. A Server Component: it checks (server-side,
// against the real database) whether the current user already owns a
// wedding plan, and redirects straight to the dashboard if so — a
// returning user should never be shown the setup wizard again. Only a
// genuinely new user sees the form.
//
// force-dynamic for the same reason as (app)/layout.tsx: this page's
// redirect decision depends on live database state, and it's outside
// that layout so it needs its own opt-out of static prerendering.

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  const existing = await prisma.weddingPlan.findFirst({ where: { ownerUserId: user.id } });
  if (existing) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-akoma-cream px-6 py-16">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-3xl font-bold text-akoma-ink">Let&apos;s set up your wedding</h1>
        <p className="mt-2 text-akoma-ink/70">
          A few details to get your dashboard, budget, and checklist ready. You can change any of this later.
        </p>
      </div>
      <div className="mt-10">
        <OnboardingForm />
      </div>
    </div>
  );
}
