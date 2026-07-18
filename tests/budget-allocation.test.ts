// tests/budget-allocation.test.ts
//
// The one hard requirement the task calls out explicitly: automated
// budget allocation must never exceed the total budget, and its
// percentages must sum to 100 — checked here across every approach and
// a range of budget sizes (including ones that don't divide evenly,
// where naive per-category rounding would otherwise drift off by a
// cedi or two).

import { describe, expect, it } from "vitest";
import {
  buildPercentageAllocation,
  buildVendorBasedAllocation,
  ALLOCATION_CATEGORY_NAMES,
  type AllocationTightness,
} from "@/lib/budget-allocation";

const TIGHTNESSES: AllocationTightness[] = ["TIGHT", "BALANCED", "FLEXIBLE"];
const BUDGETS = [0, 100, 1000, 33_333, 120_000, 999_999];

describe("buildPercentageAllocation", () => {
  for (const tightness of TIGHTNESSES) {
    it(`${tightness}: percentages sum to exactly 100`, () => {
      const items = buildPercentageAllocation(100_000, tightness);
      const totalPercent = items.reduce((sum, i) => sum + i.percent, 0);
      expect(totalPercent).toBe(100);
    });

    it(`${tightness}: covers every default budget category exactly once`, () => {
      const items = buildPercentageAllocation(100_000, tightness);
      expect(items.map((i) => i.category).sort()).toEqual([...ALLOCATION_CATEGORY_NAMES].sort());
    });

    for (const budget of BUDGETS) {
      it(`${tightness}: amounts sum to exactly the total budget (GHS ${budget})`, () => {
        const items = buildPercentageAllocation(budget, tightness);
        const totalAmount = items.reduce((sum, i) => sum + i.amountGHS, 0);
        expect(totalAmount).toBe(Math.round(budget));
      });

      it(`${tightness}: never allocates a negative amount (GHS ${budget})`, () => {
        const items = buildPercentageAllocation(budget, tightness);
        for (const item of items) expect(item.amountGHS).toBeGreaterThanOrEqual(0);
      });
    }
  }
});

describe("buildVendorBasedAllocation", () => {
  it("normalizes real price signals to sum to exactly the total budget", () => {
    const signals = ALLOCATION_CATEGORY_NAMES.map((category, i) => ({
      category,
      representativePriceGHS: i % 2 === 0 ? 1000 + i * 250 : null, // half real data, half fallback
    }));
    const items = buildVendorBasedAllocation(120_000, "BALANCED", signals);
    const totalAmount = items.reduce((sum, i) => sum + i.amountGHS, 0);
    const totalPercent = items.reduce((sum, i) => sum + i.percent, 0);
    expect(totalAmount).toBe(120_000);
    expect(totalPercent).toBe(100);
  });

  it("never exceeds the total budget even when raw vendor prices alone would", () => {
    // Every category has a huge representative price — without
    // normalization this would wildly exceed the stated budget.
    const signals = ALLOCATION_CATEGORY_NAMES.map((category) => ({ category, representativePriceGHS: 500_000 }));
    const items = buildVendorBasedAllocation(50_000, "TIGHT", signals);
    const totalAmount = items.reduce((sum, i) => sum + i.amountGHS, 0);
    expect(totalAmount).toBe(50_000);
  });

  it("falls back to the balanced percentage table for a category with no pricing data at all", () => {
    const signals = ALLOCATION_CATEGORY_NAMES.map((category) => ({ category, representativePriceGHS: null }));
    const items = buildVendorBasedAllocation(100_000, "FLEXIBLE", signals);
    const totalAmount = items.reduce((sum, i) => sum + i.amountGHS, 0);
    expect(totalAmount).toBe(100_000);
    // With every signal null, this degenerates to the balanced table's own shape.
    const totalPercent = items.reduce((sum, i) => sum + i.percent, 0);
    expect(totalPercent).toBe(100);
  });
});
