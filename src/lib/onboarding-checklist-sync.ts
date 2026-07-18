// src/lib/onboarding-checklist-sync.ts
//
// Which default checklist items should start already-completed based on
// what the couple answered during the onboarding wizard — called once,
// at createWeddingPlan() time (server/actions/wedding.ts), before the
// default checklist is written, so the couple never sees a task asking
// them to do something they just told the wizard they'd already done.
//
// Deliberately conservative: only ever marks a task done when the
// onboarding answer is a genuine, unambiguous match for that exact
// default-template item — never guesses, and never invents a
// completion for something the template has no real equivalent of.
//
// Kept separate from lib/checklist-defaults.ts (which stays a plain
// template + date-builder, no onboarding-shape knowledge) and from
// server/actions/wedding.ts (kept thin per its own header comment) — one
// small file owns this one mapping.

import type { OnboardingVendorCategory } from "@prisma/client";
import { ONBOARDING_CATEGORY_CHECKLIST_TITLES, type DefaultChecklistTitle } from "./checklist-defaults";

export interface OnboardingChecklistSyncInput {
  /** Always present — totalBudgetGHS/weddingDate/guestEstimate are
   *  required fields in the onboarding form itself (see
   *  lib/validation/wedding.ts's onboardingSchema), so these three are
   *  really "was onboarding completed at all," not conditional checks —
   *  kept as explicit booleans anyway so a future optional-field change
   *  doesn't silently start lying about task completion. */
  budgetWasSet: boolean;
  weddingDateWasSet: boolean;
  guestEstimateWasSet: boolean;
  theme?: string;
  primaryColor?: string;
  secondaryColor?: string;
  vendorStatus: Partial<Record<OnboardingVendorCategory, "NOT_STARTED" | "RESEARCHING" | "BOOKED">>;
}

export function determineOnboardingCompletedTitles(input: OnboardingChecklistSyncInput): Set<DefaultChecklistTitle> {
  const titles = new Set<DefaultChecklistTitle>();

  if (input.budgetWasSet) titles.add("Set the wedding budget");
  if (input.weddingDateWasSet) titles.add("Agree on a wedding date with both families");
  if (input.guestEstimateWasSet) titles.add("Start a first-draft guest list");
  if (input.theme || input.primaryColor || input.secondaryColor) {
    titles.add("Choose your wedding style, theme and colour palette");
  }

  for (const [category, status] of Object.entries(input.vendorStatus)) {
    if (status !== "BOOKED") continue;
    const matchedTitles = ONBOARDING_CATEGORY_CHECKLIST_TITLES[category as OnboardingVendorCategory];
    matchedTitles?.forEach((title) => titles.add(title));
  }

  return titles;
}
