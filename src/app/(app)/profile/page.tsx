// src/app/(app)/profile/page.tsx
//
// Editable view of everything the onboarding wizard collected. Core
// wedding facts (date, city, budget, guest estimate) stay on /settings —
// this page is specifically the CoupleProfile data.

import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { ProfileForm } from "@/components/profile/ProfileForm";

export default async function ProfilePage() {
  const weddingPlan = await getCurrentWeddingPlan();
  const profile = await prisma.coupleProfile.findUnique({ where: { weddingPlanId: weddingPlan!.id } });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-akoma-ink">Profile</h1>
        <p className="mt-1 text-sm text-akoma-ink/60">
          Everything from your onboarding answers — fill in more or change anything, any time.
        </p>
      </div>
      <ProfileForm profile={profile} />
    </div>
  );
}
