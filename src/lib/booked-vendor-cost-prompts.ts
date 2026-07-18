// src/lib/booked-vendor-cost-prompts.ts
//
// Finds vendor categories the couple marked "already booked" (either
// during onboarding's VendorStatusStep, or later via the Vendor Status
// page) that don't have a cost recorded against the matching budget
// category yet — the dashboard prompt this feeds ("Your Venue is marked
// as booked — add the agreed price?") is how the task's "do not
// automatically invent booking prices" rule stays true: the couple
// always types the real number themselves, or skips.
//
// Pure/no-Prisma so it's unit-testable — dashboard/page.tsx already
// fetches both vendorBookingStatuses and budgetCategories for its own
// widgets, so this just re-derives a third view from data already in hand.

import type { BookingStatus, OnboardingVendorCategory } from "@prisma/client";
import { ONBOARDING_VENDOR_CATEGORIES } from "./validation/wedding";

export interface BookedVendorCostPrompt {
  category: OnboardingVendorCategory;
  categoryLabel: string;
  matchedBudgetCategoryId: string;
  matchedBudgetCategoryName: string;
  allocatedGHS: number;
}

export function findBookedVendorCostPrompts(
  vendorBookingStatuses: Array<{ category: OnboardingVendorCategory; status: BookingStatus }>,
  budgetCategories: Array<{ id: string; name: string; allocatedGHS: number; spentGHS: number }>
): BookedVendorCostPrompt[] {
  const results: BookedVendorCostPrompt[] = [];

  for (const vbs of vendorBookingStatuses) {
    if (vbs.status !== "BOOKED") continue;

    const label = ONBOARDING_VENDOR_CATEGORIES.find((c) => c.value === vbs.category)?.label;
    if (!label) continue;

    const budgetCategory = budgetCategories.find((b) => b.name === label);
    // No matching category (renamed/deleted by the couple) or a cost is
    // already recorded — either way, nothing to prompt for.
    if (!budgetCategory || budgetCategory.spentGHS > 0) continue;

    results.push({
      category: vbs.category,
      categoryLabel: label,
      matchedBudgetCategoryId: budgetCategory.id,
      matchedBudgetCategoryName: budgetCategory.name,
      allocatedGHS: budgetCategory.allocatedGHS,
    });
  }

  return results;
}
