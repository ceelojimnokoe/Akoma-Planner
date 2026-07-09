// src/lib/plan.ts
//
// Feature gating lives here, in exactly one place, so "is this allowed on
// the Free plan?" is never re-implemented (and never drifts) across pages,
// server actions, and API routes. A `WeddingPlan.plan` field (FREE | PRO)
// drives everything — there is no separate subscription/billing table for
// the MVP since checkout is a stub (see src/app/api/billing/checkout).

import type { Plan } from "@prisma/client";

/** Hard limits that apply only to the Free plan. Pro has none of these. */
export const FREE_LIMITS = {
  maxWeddingPlansPerUser: 1,
  maxGuests: 100,
  // Default (isDefault: true) checklist items never count against this —
  // it only caps custom tasks the couple adds themselves. This is what
  // "richer" checklists mean on Pro: unlimited custom tasks vs. a capped
  // number on Free.
  maxCustomChecklistItems: 15,
} as const;

export type ProGateResult =
  | { allowed: true }
  | { allowed: false; upgradeReason: string };

/**
 * The single gate every Pro-only action or query should pass through.
 * Returns a typed result instead of throwing, so callers (server actions,
 * route handlers) decide how to surface the upgrade prompt rather than
 * catching an exception.
 */
export function requirePro(plan: Plan, featureLabel: string): ProGateResult {
  if (plan === "PRO") return { allowed: true };
  return {
    allowed: false,
    upgradeReason: `${featureLabel} is part of AkomaPlanner Pro. Upgrade to unlock it.`,
  };
}

/** Free plan: capped at FREE_LIMITS.maxWeddingPlansPerUser. Pro: unlimited. */
export function canCreateWeddingPlan(plan: Plan, existingPlanCount: number): ProGateResult {
  if (plan === "PRO") return { allowed: true };
  if (existingPlanCount < FREE_LIMITS.maxWeddingPlansPerUser) return { allowed: true };
  return {
    allowed: false,
    upgradeReason: `Free accounts can plan ${FREE_LIMITS.maxWeddingPlansPerUser} wedding at a time. Upgrade to Pro for unlimited weddings.`,
  };
}

/** Free plan: capped at FREE_LIMITS.maxGuests per wedding. Pro: unlimited. */
export function canAddGuest(plan: Plan, existingGuestCount: number): ProGateResult {
  if (plan === "PRO") return { allowed: true };
  if (existingGuestCount < FREE_LIMITS.maxGuests) return { allowed: true };
  return {
    allowed: false,
    upgradeReason: `Free accounts are capped at ${FREE_LIMITS.maxGuests} guests. Upgrade to Pro for unlimited guests.`,
  };
}

/** Free plan: capped at FREE_LIMITS.maxCustomChecklistItems custom tasks
 *  (default checklist items don't count). Pro: unlimited. */
export function canAddChecklistItem(plan: Plan, existingCustomItemCount: number): ProGateResult {
  if (plan === "PRO") return { allowed: true };
  if (existingCustomItemCount < FREE_LIMITS.maxCustomChecklistItems) return { allowed: true };
  return {
    allowed: false,
    upgradeReason: `Free accounts can add up to ${FREE_LIMITS.maxCustomChecklistItems} custom tasks. Upgrade to Pro for unlimited tasks.`,
  };
}
