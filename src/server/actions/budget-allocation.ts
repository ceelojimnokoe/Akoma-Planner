// src/server/actions/budget-allocation.ts
//
// Server-side half of "Automatically Allocate My Budget": fetches real
// vendor/accommodation/traditional-list pricing (for the vendor-pricing-
// based approach), then hands plain numbers to the pure calculators in
// lib/budget-allocation.ts. Applying the result only ever writes
// BudgetCategory.allocatedGHS — spentGHS is never touched here, matching
// the task's own "do not overwrite amounts already spent" rule.

"use server";

import { revalidatePath } from "next/cache";
import type { VendorCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import {
  buildPercentageAllocation,
  buildVendorBasedAllocation,
  isKnownAllocationCategory,
  ALLOCATION_CATEGORY_NAMES,
  type AllocationApproach,
  type AllocationTightness,
  type AllocationPreviewItem,
  type CategoryPriceSignal,
} from "@/lib/budget-allocation";
import { TRADITIONAL_CUSTOMARY_BUDGET_NAME } from "@/lib/traditional-ceremony-defaults";

// Reverse of lib/budget-fit.ts's vendor-category -> budget-keyword map —
// that one is deliberately loose/fuzzy for matching an existing free-text
// row; this one needs to be exact and complete for pricing lookups.
// Videography and Accommodation/Traditional Customary have no entry here
// on purpose — see the categoryPriceSignals() branches below for how
// each of those three is actually priced.
const CATEGORY_TO_VENDOR_CATEGORY: Partial<Record<string, VendorCategory>> = {
  Venue: "VENUE",
  Catering: "CATERING",
  Photography: "PHOTOGRAPHY",
  Decoration: "DECOR",
  "Wedding Planner / Coordinator": "PLANNER",
  "Entertainment / DJ": "MUSIC",
  "Master of Ceremonies (MC)": "MC",
  "Bridal Wear": "ATTIRE",
  "Groom's Wear": "ATTIRE",
  "Hair & Makeup": "MAKEUP",
  Jewellery: "JEWELLERY",
  Cake: "CAKE",
  Transportation: "TRANSPORT",
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function representativePrice(tightness: AllocationTightness, lows: number[], highs: number[]): number | null {
  if (lows.length === 0) return null;
  if (tightness === "TIGHT") return Math.min(...lows);
  if (tightness === "FLEXIBLE") return average(highs);
  return median(lows.map((low, i) => (low + highs[i]) / 2));
}

/** Gathers a real GHS price signal per budget category from Vendor,
 *  Accommodation, and TraditionalListItem — everything this app already
 *  has real pricing data for. Returns null for a category with no
 *  matching data (Videography has no distinct catalog category yet),
 *  which lib/budget-allocation.ts's buildVendorBasedAllocation() treats
 *  as "fall back to the balanced percentage table" rather than guessing.
 *
 *  Catering vendors are priced per head (see reference-data.ts — e.g.
 *  "GH₵60-180" alongside a "100 to 1000 guests" description), unlike
 *  every other category's flat total price, so its representative price
 *  is scaled by guestEstimate here to make it comparable as a weight —
 *  without this, Catering's weight was ~1/100th of what it should be. */
async function categoryPriceSignals(tightness: AllocationTightness, guestEstimate: number): Promise<CategoryPriceSignal[]> {
  const [vendors, accommodations, traditionalItems] = await Promise.all([
    prisma.vendor.findMany({ select: { category: true, priceLowGHS: true, priceHighGHS: true } }),
    prisma.accommodation.findMany({ select: { priceLowGHS: true, priceHighGHS: true } }),
    prisma.traditionalListItem.findMany({ select: { estLowGHS: true, estHighGHS: true } }),
  ]);

  const vendorsByCategory = new Map<VendorCategory, { lows: number[]; highs: number[] }>();
  for (const v of vendors) {
    const bucket = vendorsByCategory.get(v.category) ?? { lows: [], highs: [] };
    bucket.lows.push(v.priceLowGHS);
    bucket.highs.push(v.priceHighGHS);
    vendorsByCategory.set(v.category, bucket);
  }

  return ALLOCATION_CATEGORY_NAMES.map((category) => {
    if (category === "Accommodation") {
      return {
        category,
        representativePriceGHS: representativePrice(
          tightness,
          accommodations.map((a) => a.priceLowGHS),
          accommodations.map((a) => a.priceHighGHS)
        ),
      };
    }
    if (category === TRADITIONAL_CUSTOMARY_BUDGET_NAME) {
      // The whole traditional-customary envelope covers every item
      // (drinks, kente, family gifts, ...) together, not one vendor
      // choice — summed, not median/averaged like the others.
      const lowSum = traditionalItems.reduce((sum, i) => sum + i.estLowGHS, 0);
      const highSum = traditionalItems.reduce((sum, i) => sum + i.estHighGHS, 0);
      const mid = (lowSum + highSum) / 2;
      return {
        category,
        representativePriceGHS: traditionalItems.length === 0 ? null : tightness === "TIGHT" ? lowSum : tightness === "FLEXIBLE" ? highSum : mid,
      };
    }
    const vendorCategory = CATEGORY_TO_VENDOR_CATEGORY[category];
    const bucket = vendorCategory ? vendorsByCategory.get(vendorCategory) : undefined;
    const perUnitPrice = bucket ? representativePrice(tightness, bucket.lows, bucket.highs) : null;
    const representativePriceGHS =
      category === "Catering" && perUnitPrice != null ? perUnitPrice * Math.max(1, guestEstimate) : perUnitPrice;
    return { category, representativePriceGHS };
  });
}

export interface AllocationPreviewResult {
  items: AllocationPreviewItem[];
  totalBudgetGHS: number;
  /** True when any default category already has a non-zero allocation —
   *  the form asks Replace/Fill-empty/Cancel before applying when this
   *  is true, per the task's own "do not overwrite... without warning". */
  hasExistingAllocations: boolean;
}

export async function previewBudgetAllocation(
  approach: AllocationApproach,
  tightness: AllocationTightness = "BALANCED"
): Promise<AllocationPreviewResult> {
  const weddingPlan = await getCurrentWeddingPlan();
  if (!weddingPlan) throw new Error("No wedding plan found for your account.");

  const existingCategories = await prisma.budgetCategory.findMany({
    where: { weddingPlanId: weddingPlan.id },
    select: { name: true, allocatedGHS: true },
  });

  const items =
    approach === "VENDOR_BASED"
      ? buildVendorBasedAllocation(weddingPlan.totalBudgetGHS, tightness, await categoryPriceSignals(tightness, weddingPlan.guestEstimate))
      : buildPercentageAllocation(weddingPlan.totalBudgetGHS, approach);

  const hasExistingAllocations = existingCategories.some(
    (c) => isKnownAllocationCategory(c.name) && c.allocatedGHS > 0
  );

  return { items, totalBudgetGHS: weddingPlan.totalBudgetGHS, hasExistingAllocations };
}

export interface ApplyAllocationResult {
  ok: boolean;
  error?: string;
  appliedCount?: number;
}

/**
 * Writes allocatedGHS for each recommended category — creating the
 * BudgetCategory row if the couple had deleted it, updating it
 * otherwise. Never touches spentGHS. `mode: "fill-empty"` skips any
 * category that already has a non-zero allocatedGHS, leaving the
 * couple's own edits alone.
 */
export async function applyBudgetAllocation(
  allocations: Array<{ category: string; amountGHS: number }>,
  mode: "replace" | "fill-empty"
): Promise<ApplyAllocationResult> {
  const weddingPlan = await getCurrentWeddingPlan();
  if (!weddingPlan) return { ok: false, error: "No wedding plan found for your account." };

  const existing = await prisma.budgetCategory.findMany({ where: { weddingPlanId: weddingPlan.id } });
  const existingByName = new Map(existing.map((c) => [c.name, c]));

  let appliedCount = 0;
  await prisma.$transaction(async (tx) => {
    for (const { category, amountGHS } of allocations) {
      const current = existingByName.get(category);
      if (mode === "fill-empty" && current && current.allocatedGHS > 0) continue;

      if (current) {
        await tx.budgetCategory.update({ where: { id: current.id }, data: { allocatedGHS: amountGHS } });
      } else {
        await tx.budgetCategory.create({ data: { weddingPlanId: weddingPlan.id, name: category, allocatedGHS: amountGHS } });
      }
      appliedCount++;
    }
  });

  revalidatePath("/budget");
  revalidatePath("/dashboard");
  revalidatePath("/vendors");
  return { ok: true, appliedCount };
}
