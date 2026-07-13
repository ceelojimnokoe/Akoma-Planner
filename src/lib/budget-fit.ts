// src/lib/budget-fit.ts
//
// Compares a vendor's or accommodation's price against the couple's own
// allocated budget for the matching category — "Fits within your
// allocated budget" or "Exceeds your allocated budget by GH₵XXX".
// BudgetCategory.name is free-text (the couple can rename or delete any
// category), so matching is fuzzy/best-effort by design: no match found
// simply means no indicator shows, never a crash or a misleading number.
//
// Compares against the category's full allocatedGHS, not what's left
// after other spending — "fits within your allocated budget" reads as
// the allocation itself, not a remaining-balance check.
//
// Deliberately NOT computed for a locked (isProFeatured, Free-viewer)
// vendor card at the call site — those already hide price entirely, and
// a fit badge would leak a cheaper/pricier signal through the lock. See
// VendorCard.tsx / vendors/page.tsx.

import type { VendorCategory } from "@prisma/client";
import { formatGHS } from "./currency";

interface BudgetCategoryLike {
  name: string;
  allocatedGHS: number;
}

// Vendor categories and the free-text default budget category names
// don't 1:1 match (e.g. default budget rows are now named after
// ONBOARDING_VENDOR_CATEGORIES' labels — "Entertainment / DJ", "Hair &
// Makeup" — not the catalog's own enum words) — this is a deliberately
// loose, case-insensitive keyword lookup, not a strict enum mapping.
// OTHER has no sensible default counterpart and is left unmapped on
// purpose, matching this file's own no-match-means-no-indicator rule
// rather than guessing.
//
// ATTIRE is deliberately mapped to "bridal" ONLY, never "groom" or a
// bare "wear" — the catalog has one ATTIRE value but the default budget
// set has two rows ("Bridal Wear" / "Groom's Wear"), and this function
// has no way to tell which kind of attire vendor it's looking at. A
// generic "wear" keyword would silently match "Bridal Wear" first every
// time (array order), showing a wrong budget-fit for groom's-wear
// vendors instead of none — matching only "bridal" means a groom's-wear
// vendor shows no indicator at all, same directional bias as
// lib/vendor-booking-progress.ts's guessOnboardingCategory (ATTIRE →
// BRIDAL_WEAR), never a misleading one.
const VENDOR_CATEGORY_TO_BUDGET_KEYWORDS: Record<VendorCategory, string[]> = {
  VENUE: ["venue"],
  CATERING: ["catering"],
  PHOTOGRAPHY: ["photography", "photo"],
  ATTIRE: ["bridal"],
  DECOR: ["decor"],
  MUSIC: ["music", "entertainment", "dj", "band"],
  MAKEUP: ["makeup", "hair"],
  TRANSPORT: ["transport"],
  CAKE: ["cake"],
  OTHER: [],
  JEWELLERY: ["jewellery", "jewelry", "ring"],
  MC: ["master of ceremonies", "emcee", "mc"],
  PLANNER: ["planner", "coordinator"],
};

function findCategoryByKeywords<T extends BudgetCategoryLike>(categories: T[], keywords: string[]): T | null {
  if (keywords.length === 0) return null;
  return categories.find((c) => keywords.some((kw) => c.name.toLowerCase().includes(kw))) ?? null;
}

/** Matches a vendor's category (an enum) to the couple's own free-text
 *  budget categories. */
export function matchVendorBudgetCategory<T extends BudgetCategoryLike>(
  vendorCategory: VendorCategory,
  categories: T[]
): T | null {
  return findCategoryByKeywords(categories, VENDOR_CATEGORY_TO_BUDGET_KEYWORDS[vendorCategory]);
}

/** Matches by a literal category name — used for Accommodation, which
 *  isn't typed by a VendorCategory-style enum at all. */
export function matchBudgetCategoryByName<T extends BudgetCategoryLike>(name: string, categories: T[]): T | null {
  return findCategoryByKeywords(categories, [name.toLowerCase()]);
}

export interface BudgetFitResult {
  fits: boolean;
  label: string;
}

export function getBudgetFit(priceLowGHS: number, category: BudgetCategoryLike): BudgetFitResult {
  if (priceLowGHS <= category.allocatedGHS) {
    return { fits: true, label: "Fits within your allocated budget" };
  }
  const over = priceLowGHS - category.allocatedGHS;
  return { fits: false, label: `Exceeds your allocated budget by ${formatGHS(over)}` };
}
