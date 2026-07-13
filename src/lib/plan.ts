// src/lib/plan.ts
//
// Feature gating lives here, in exactly one place, so "does this account
// have the Wedding Pass?" is never re-implemented (and never drifts)
// across pages, server actions, and API routes. One-time payment, not a
// subscription: WeddingPlan.hasWeddingPass is a single boolean set once a
// payment is verified (see Workstream C / server/actions/billing.ts) and
// never unset by anything in normal use — there's no renewal/expiry to
// track, and Settings' dev-only downgrade toggle aside, nothing in
// production ever flips it back to false.

import { WEDDING_PASS_AMOUNT_GHS } from "./pricing";

/** Hard limits that apply only to accounts without the Wedding Pass. */
export const FREE_LIMITS = {
  maxWeddingPlansPerUser: 1,
  maxGuests: 100,
  // Default (isDefault: true) checklist items never count against this —
  // it only caps custom tasks the couple adds themselves.
  maxCustomChecklistItems: 15,
} as const;

export type PassGateResult =
  | { allowed: true }
  | { allowed: false; upgradeReason: string };

/**
 * The single source of truth for "does this account have full access?"
 * Every other function below, and every gate check elsewhere in the app,
 * calls this rather than reading hasWeddingPass directly — if access
 * logic ever needs to change (e.g. an admin override), this is the only
 * place that has to.
 */
export function canAccessPassFeatures(weddingPlan: { hasWeddingPass: boolean }): boolean {
  return weddingPlan.hasWeddingPass;
}

/**
 * The single gate every Pass-only action or query should pass through.
 * Returns a typed result instead of throwing, so callers (server actions,
 * route handlers) decide how to surface the upgrade prompt rather than
 * catching an exception.
 */
export function requirePass(weddingPlan: { hasWeddingPass: boolean }, featureLabel: string): PassGateResult {
  if (canAccessPassFeatures(weddingPlan)) return { allowed: true };
  return {
    allowed: false,
    upgradeReason: `${featureLabel} is part of the Wedding Pass. Unlock it for a one-time GH¢${WEDDING_PASS_AMOUNT_GHS}.`,
  };
}

/** Without the Pass: capped at FREE_LIMITS.maxWeddingPlansPerUser. */
export function canCreateWeddingPlan(
  weddingPlan: { hasWeddingPass: boolean },
  existingPlanCount: number
): PassGateResult {
  if (canAccessPassFeatures(weddingPlan)) return { allowed: true };
  if (existingPlanCount < FREE_LIMITS.maxWeddingPlansPerUser) return { allowed: true };
  return {
    allowed: false,
    upgradeReason: `Free accounts can plan ${FREE_LIMITS.maxWeddingPlansPerUser} wedding at a time. Get the Wedding Pass for unlimited weddings.`,
  };
}

/** Without the Pass: capped at FREE_LIMITS.maxGuests per wedding. */
export function canAddGuest(weddingPlan: { hasWeddingPass: boolean }, existingGuestCount: number): PassGateResult {
  if (canAccessPassFeatures(weddingPlan)) return { allowed: true };
  if (existingGuestCount < FREE_LIMITS.maxGuests) return { allowed: true };
  return {
    allowed: false,
    upgradeReason: `Free accounts are capped at ${FREE_LIMITS.maxGuests} guests. Get the Wedding Pass for unlimited guests.`,
  };
}

/** A distinct check from canAddGuest above: this gates the couple's own
 *  *estimate* number (WeddingPlan.guestEstimate) when they edit it,
 *  rather than actual Guest rows added. Without the Pass: capped at
 *  FREE_LIMITS.maxGuests, same ceiling, different thing being counted. */
export function canSetGuestEstimate(weddingPlan: { hasWeddingPass: boolean }, guestEstimate: number): PassGateResult {
  if (canAccessPassFeatures(weddingPlan)) return { allowed: true };
  if (guestEstimate <= FREE_LIMITS.maxGuests) return { allowed: true };
  return {
    allowed: false,
    upgradeReason: `Free accounts are capped at ${FREE_LIMITS.maxGuests} guests. Get the Wedding Pass for unlimited guest management.`,
  };
}

/** Without the Pass: capped at FREE_LIMITS.maxCustomChecklistItems custom
 *  tasks (default checklist items don't count). */
export function canAddChecklistItem(
  weddingPlan: { hasWeddingPass: boolean },
  existingCustomItemCount: number
): PassGateResult {
  if (canAccessPassFeatures(weddingPlan)) return { allowed: true };
  if (existingCustomItemCount < FREE_LIMITS.maxCustomChecklistItems) return { allowed: true };
  return {
    allowed: false,
    upgradeReason: `Free accounts can add up to ${FREE_LIMITS.maxCustomChecklistItems} custom tasks. Get the Wedding Pass for unlimited tasks.`,
  };
}
