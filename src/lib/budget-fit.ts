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
// don't 1:1 match (e.g. "Photography & Media" vs. PHOTOGRAPHY) — this is
// a deliberately loose, case-insensitive keyword lookup, not a strict
// enum mapping. MAKEUP and OTHER have no sensible default counterpart
// and are left unmapped on purpose, matching this file's own
// no-match-means-no-indicator rule rather than guessing.
const VENDOR_CATEGORY_TO_BUDGET_KEYWORDS: Record<VendorCategory, string[]> = {
  VENUE: ["venue"],
  CATERING: ["catering"],
  PHOTOGRAPHY: ["photography", "photo"],
  ATTIRE: ["attire"],
  DECOR: ["decor"],
  MUSIC: ["music"],
  MAKEUP: [],
  TRANSPORT: ["transport"],
  CAKE: ["cake"],
  OTHER: [],
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
