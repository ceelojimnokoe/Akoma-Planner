// src/lib/budget-allocation.ts
//
// Pure calculation logic for "Automatically Allocate My Budget" — no
// Prisma import, same "plain data in, plain data out" testable shape as
// lib/budget.ts. The percentage tables below are the app's one
// definition of what "tight / balanced / flexible" mean in practice;
// server/actions/budget-allocation.ts is the only caller, and it's the
// one that does the actual Prisma reads (vendor/accommodation/
// traditional-list pricing) that "based on my budget and available
// vendors" needs.
//
// Every approach normalizes to percentages that sum to exactly 100 (see
// normalizeToHundred) — including the vendor-pricing-based one — so
// "the final percentages equal 100%" and "never exceed the user's total
// wedding budget" both hold structurally, not just for the fixed-table
// approaches the task calls that out for explicitly.

import { TRADITIONAL_CUSTOMARY_BUDGET_NAME } from "./traditional-ceremony-defaults";

export type AllocationTightness = "TIGHT" | "BALANCED" | "FLEXIBLE";

export const ALLOCATION_APPROACHES = ["TIGHT", "BALANCED", "FLEXIBLE", "VENDOR_BASED"] as const;
export type AllocationApproach = (typeof ALLOCATION_APPROACHES)[number];

// The 16 categories every wedding plan starts with (see
// lib/budget-defaults.ts's buildDefaultBudgetCategories) — allocation
// only ever targets rows matching these exact names; a category the
// couple renamed or added themselves is simply left out of the
// recommendation (same "no match, no crash" tolerance as lib/budget-fit.ts).
const CATEGORY_NAMES = [
  "Venue",
  "Catering",
  "Photography",
  "Videography",
  "Decoration",
  "Wedding Planner / Coordinator",
  "Entertainment / DJ",
  "Master of Ceremonies (MC)",
  "Bridal Wear",
  "Groom's Wear",
  "Hair & Makeup",
  "Jewellery",
  "Cake",
  "Transportation",
  "Accommodation",
  TRADITIONAL_CUSTOMARY_BUDGET_NAME,
] as const;

/**
 * Percentage-of-total-budget tables for the three fixed approaches. Each
 * column sums to exactly 100 — verified by tests/budget-allocation.test.ts,
 * not just by hand-checking the arithmetic once here.
 *
 * Design intent, not just numbers:
 *  - TIGHT leans hard into Venue + Catering (the two costs that can't be
 *    skipped) and Traditional Customary (culturally non-negotiable, and
 *    relatively fixed in absolute terms so it's a *larger* share of a
 *    smaller budget) — the "nice to have" categories (Videography,
 *    Decoration, Planner, Jewellery) get cut hardest.
 *  - FLEXIBLE shifts share toward the categories where "quality and
 *    experience matter most" (Photography, Videography, Decoration, a
 *    hired Planner) and pulls it from Venue/Catering's own share
 *    (still the largest single lines, just proportionally smaller).
 *  - BALANCED sits between the two on every category.
 */
const PERCENTAGE_TABLE: Record<AllocationTightness, Record<(typeof CATEGORY_NAMES)[number], number>> = {
  TIGHT: {
    Venue: 30,
    Catering: 26,
    Photography: 4,
    Videography: 1,
    Decoration: 4,
    "Wedding Planner / Coordinator": 2,
    "Entertainment / DJ": 2,
    "Master of Ceremonies (MC)": 2,
    "Bridal Wear": 6,
    "Groom's Wear": 3,
    "Hair & Makeup": 2,
    Jewellery: 2,
    Cake: 2,
    Transportation: 3,
    Accommodation: 2,
    [TRADITIONAL_CUSTOMARY_BUDGET_NAME]: 9,
  },
  BALANCED: {
    Venue: 20,
    Catering: 18,
    Photography: 7,
    Videography: 4,
    Decoration: 8,
    "Wedding Planner / Coordinator": 6,
    "Entertainment / DJ": 5,
    "Master of Ceremonies (MC)": 2,
    "Bridal Wear": 7,
    "Groom's Wear": 3,
    "Hair & Makeup": 3,
    Jewellery: 4,
    Cake: 2,
    Transportation: 3,
    Accommodation: 3,
    [TRADITIONAL_CUSTOMARY_BUDGET_NAME]: 5,
  },
  FLEXIBLE: {
    Venue: 15,
    Catering: 14,
    Photography: 10,
    Videography: 6,
    Decoration: 8,
    "Wedding Planner / Coordinator": 8,
    "Entertainment / DJ": 6,
    "Master of Ceremonies (MC)": 2,
    "Bridal Wear": 8,
    "Groom's Wear": 3,
    "Hair & Makeup": 4,
    Jewellery: 4,
    Cake: 2,
    Transportation: 3,
    Accommodation: 3,
    [TRADITIONAL_CUSTOMARY_BUDGET_NAME]: 4,
  },
};

const EXPLANATION: Record<AllocationTightness, Record<(typeof CATEGORY_NAMES)[number], string>> = {
  TIGHT: {
    Venue: "The largest single cost, kept prioritised even on a tight budget.",
    Catering: "Per-head cost adds up fast — the other essential you can't scale down much.",
    Photography: "Kept modest — a shorter package or a newer studio keeps this affordable.",
    Videography: "Trimmed hardest — often the easiest to skip or add later if funds allow.",
    Decoration: "A simpler decor package covers the essentials without the full styling package.",
    "Wedding Planner / Coordinator": "Minimal — DIY coordination or a day-of-only helper instead of full planning.",
    "Entertainment / DJ": "A DJ-only package rather than a live band keeps this affordable.",
    "Master of Ceremonies (MC)": "A standard MC package — this cost doesn't scale much with budget size.",
    "Bridal Wear": "Kept practical — hire or a simpler design instead of full custom couture.",
    "Groom's Wear": "A made-to-measure suit rather than a premium custom option.",
    "Hair & Makeup": "Bridal-only glam rather than a full bridal-party package.",
    Jewellery: "Simpler pieces or family jewellery rather than new custom-made sets.",
    Cake: "A smaller or single-tier cake covers the ceremony without the premium design cost.",
    Transportation: "A single decorated car rather than a full guest-shuttle fleet.",
    Accommodation: "Budget-friendly guesthouse-style options for out-of-town family.",
    [TRADITIONAL_CUSTOMARY_BUDGET_NAME]: "Customary items (drinks, kente, family gifts) are largely fixed costs — protected even on a tight budget.",
  },
  BALANCED: {
    Venue: "A realistic share for the day's biggest single cost.",
    Catering: "Standard recommended share for a full-service caterer.",
    Photography: "Covers a full-day package with an edited album.",
    Videography: "A solid same-day-edit or short highlight-reel package.",
    Decoration: "A complete styling package: florals, drapery and lighting.",
    "Wedding Planner / Coordinator": "Day-of coordination, so nothing falls through on the day itself.",
    "Entertainment / DJ": "A DJ and MC combo, or a modest live-band option.",
    "Master of Ceremonies (MC)": "A standard, experienced MC package.",
    "Bridal Wear": "A realistic share for a made-to-measure or boutique gown.",
    "Groom's Wear": "A made-to-measure suit or kaftan.",
    "Hair & Makeup": "Bridal party glam with a trial session included.",
    Jewellery: "A meaningful but reasonable share for rings and bridal jewellery.",
    Cake: "A multi-tier custom cake with delivery.",
    Transportation: "Decorated cars for the couple plus a guest shuttle or two.",
    Accommodation: "A comfortable mid-range hotel block for out-of-town family.",
    [TRADITIONAL_CUSTOMARY_BUDGET_NAME]: "Standard recommended share for drinks, kente and customary family gifts.",
  },
  FLEXIBLE: {
    Venue: "Still the largest cost, though a smaller share to make room for other priorities.",
    Catering: "A smaller share than Tight/Balanced — still fully covers a quality caterer.",
    Photography: "A generous share for a premium studio and full-day cinematic coverage.",
    Videography: "A full cinematic same-day-edit package.",
    Decoration: "Room for a premium styling package — florals, custom backdrops, full lighting design.",
    "Wedding Planner / Coordinator": "Full-service planning from budget through day-of coordination.",
    "Entertainment / DJ": "Room for a full live band, not just a DJ package.",
    "Master of Ceremonies (MC)": "A standard, experienced MC package.",
    "Bridal Wear": "A generous share for a custom or designer gown.",
    "Groom's Wear": "Room for a premium custom suit.",
    "Hair & Makeup": "Full bridal-party glam, not just the bride.",
    Jewellery: "A generous share for custom or higher-end pieces.",
    Cake: "A premium multi-tier design with a tasting session.",
    Transportation: "Room for a premium car (or two) plus guest shuttles.",
    Accommodation: "Room for an upscale hotel block, not just a budget option.",
    [TRADITIONAL_CUSTOMARY_BUDGET_NAME]: "A smaller share than Tight/Balanced — customary costs scale less with budget size.",
  },
};

export interface AllocationPreviewItem {
  category: string;
  percent: number;
  amountGHS: number;
  explanation: string;
}

/** Redistributes rounding error onto the largest-amount category so the
 *  sum of amountGHS is always exactly totalBudgetGHS (to the cedi), not
 *  off by a few pesewas from independently rounding each row. */
function roundAmountsToTotal(
  rawAmounts: Array<{ category: string; percent: number; explanation: string; rawAmount: number }>,
  totalBudgetGHS: number
): AllocationPreviewItem[] {
  const rounded = rawAmounts.map((r) => ({ ...r, amountGHS: Math.round(r.rawAmount) }));
  const roundedTotal = rounded.reduce((sum, r) => sum + r.amountGHS, 0);
  const diff = Math.round(totalBudgetGHS) - roundedTotal;

  if (diff !== 0 && rounded.length > 0) {
    const largest = rounded.reduce((a, b) => (b.amountGHS > a.amountGHS ? b : a));
    largest.amountGHS += diff;
  }

  return rounded.map(({ category, percent, explanation, amountGHS }) => ({ category, percent, explanation, amountGHS }));
}

/** Tight/Balanced/Flexible — a fixed, hand-tuned percentage split of the
 *  total budget, independent of any vendor pricing data. */
export function buildPercentageAllocation(totalBudgetGHS: number, tightness: AllocationTightness): AllocationPreviewItem[] {
  const table = PERCENTAGE_TABLE[tightness];
  const explanations = EXPLANATION[tightness];

  const raw = CATEGORY_NAMES.map((name) => ({
    category: name,
    percent: table[name],
    explanation: explanations[name],
    rawAmount: (table[name] / 100) * totalBudgetGHS,
  }));

  return roundAmountsToTotal(raw, totalBudgetGHS);
}

/** Per-category real pricing signal for the vendor-pricing-based
 *  approach — null means "no vendor/accommodation/traditional-list data
 *  exists for this category," in which case buildVendorBasedAllocation
 *  falls back to that category's BALANCED percentage-table weight
 *  instead of guessing a price. */
export interface CategoryPriceSignal {
  category: string;
  /** A single representative GHS figure for the chosen tightness — the
   *  caller (server/actions/budget-allocation.ts) is responsible for
   *  picking cheapest/median/higher-end from the real price data before
   *  this function ever sees it; this file stays Prisma-free. */
  representativePriceGHS: number | null;
}

/**
 * "Based on My Budget and Available Vendors" — weights each category by
 * its real representative vendor/accommodation/traditional-list price
 * where that data exists, and by the BALANCED percentage-table weight
 * (a neutral fallback, not tightness-specific, since there's no pricing
 * signal to lean tight/flexible on) where it doesn't (Videography has no
 * distinct vendor catalog category — see budget-allocation.ts's own
 * caller for why). Weights are then normalized to sum to exactly 100%,
 * same guarantee as the fixed-table approaches — this is what makes
 * "never exceed the user's total wedding budget" hold even when real
 * vendor prices alone would add up to more (or less) than the total.
 */
export function buildVendorBasedAllocation(
  totalBudgetGHS: number,
  tightness: AllocationTightness,
  signals: CategoryPriceSignal[]
): AllocationPreviewItem[] {
  const fallbackTable = PERCENTAGE_TABLE.BALANCED;
  const signalByCategory = new Map(signals.map((s) => [s.category, s.representativePriceGHS]));

  const weights = CATEGORY_NAMES.map((name) => {
    const price = signalByCategory.get(name) ?? null;
    return { category: name, weight: price != null && price > 0 ? price : fallbackTable[name] };
  });

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  const tightnessLabel = tightness === "TIGHT" ? "cheapest available" : tightness === "FLEXIBLE" ? "higher-end" : "median";

  const raw = weights.map(({ category, weight }) => {
    const percent = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
    const hasRealPrice = signalByCategory.get(category) != null;
    return {
      category,
      percent,
      explanation: hasRealPrice
        ? `Based on ${tightnessLabel} pricing from real vendors/listings in this category.`
        : `No vendor pricing available for this category yet — used a standard recommended share instead.`,
      rawAmount: (percent / 100) * totalBudgetGHS,
    };
  });

  return roundAmountsToTotal(raw, totalBudgetGHS);
}

export function isKnownAllocationCategory(name: string): boolean {
  return (CATEGORY_NAMES as readonly string[]).includes(name);
}

export { CATEGORY_NAMES as ALLOCATION_CATEGORY_NAMES };
