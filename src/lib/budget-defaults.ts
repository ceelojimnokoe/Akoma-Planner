// src/lib/budget-defaults.ts
//
// Starter budget categories every new wedding plan gets on day one, so
// the Budget tool isn't empty and the couple never has to manually
// re-create the same common wedding categories. Derived directly from
// ONBOARDING_VENDOR_CATEGORIES (lib/validation/wedding.ts) — the app's
// single 14-category taxonomy — rather than an independently hand-typed
// list, so Budget/Vendor Status/Checklist/Health Score never drift apart
// again the way the old percentage-split list (differently named, only
// loosely fuzzy-matched against vendor categories) used to.
//
// Rows start at allocatedGHS: 0/spentGHS: 0 — a deliberate philosophy
// change from "pre-fill a guessed percentage of the entered total
// budget" to "guarantee the row exists, let the couple fill in the real
// number themselves" (see BudgetCategoryRow.tsx's "—" placeholder
// treatment for zero-value rows).
//
// "Accommodation" and "Traditional Customary" are added alongside the 14
// vendor categories, even though neither is one of them:
// - app/(app)/accommodation pages already look up a budget category
//   literally named "Accommodation" (lib/budget-fit.ts's
//   matchBudgetCategoryByName), and dropping it would silently regress
//   that page's existing budget-fit badge for every new wedding plan.
// - "Traditional Customary" is the couple's overall envelope for the
//   Traditional Ceremony feature (app/(app)/traditional-ceremony) — its
//   allocatedGHS becomes that page's Total Budget, and its spentGHS is a
//   derived mirror of that page's own tracked items (see
//   server/actions/traditional-ceremony.ts). Same matchBudgetCategoryByName
//   binding, same "no match, no crash" tolerance for a renamed category.

import { ONBOARDING_VENDOR_CATEGORIES } from "./validation/wedding";
import { TRADITIONAL_CUSTOMARY_BUDGET_NAME } from "./traditional-ceremony-defaults";

export interface BuiltBudgetCategory {
  name: string;
  allocatedGHS: number;
  spentGHS: 0;
}

export function buildDefaultBudgetCategories(): BuiltBudgetCategory[] {
  return [...ONBOARDING_VENDOR_CATEGORIES.map((c) => c.label), "Accommodation", TRADITIONAL_CUSTOMARY_BUDGET_NAME].map((name) => ({
    name,
    allocatedGHS: 0,
    spentGHS: 0,
  }));
}
