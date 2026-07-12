// src/server/actions/tour.ts
//
// Persists the first-time guided tour's completion state on User
// (hasCompletedTour) — DB-backed rather than localStorage, so it
// survives across devices/sessions and "restart from Settings" can
// cleanly re-trigger it for future visits, not just the current tab.
//
// Deliberately skips revalidatePath: GuidedTourController.tsx closes the
// overlay from its own local state immediately on Skip/Finish, it
// doesn't wait on this round trip — and Next 15's default zero
// client-cache staleTime for dynamic routes already means the next real
// navigation to /dashboard fetches hasCompletedTour fresh anyway (see
// simulatePaymentDevOnly's own comment in server/actions/billing.ts for
// the exact failure mode this avoids: revalidating from a
// startTransition on the very route you're still viewing can force a
// server re-render mid-interaction).

"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function markTourCompleted(): Promise<void> {
  const user = await getCurrentUser();
  await prisma.user.update({ where: { id: user.id }, data: { hasCompletedTour: true } });
}

/** Settings' "Restart guided tour" button — redirects straight to
 *  /dashboard itself (same pattern as signOut()) since that's the only
 *  place the tour actually activates; Settings just flips the flag. */
export async function resetTour(): Promise<void> {
  const user = await getCurrentUser();
  await prisma.user.update({ where: { id: user.id }, data: { hasCompletedTour: false } });
  redirect("/dashboard");
}
