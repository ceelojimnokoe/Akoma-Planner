// tests/budget.test.ts
//
// Example Vitest test, kept intentionally simple as a pattern to copy for
// future tests: import a pure function from src/lib, feed it plain data,
// assert on the plain data it returns. No database, no rendering, no mocks.

import { describe, expect, it } from "vitest";
import { calculateBudgetSummary } from "@/lib/budget";

describe("calculateBudgetSummary", () => {
  it("aggregates allocated/spent totals and per-category percentages", () => {
    const summary = calculateBudgetSummary(10_000, [
      { id: "1", name: "Venue", allocatedGHS: 4_000, spentGHS: 4_000 },
      { id: "2", name: "Catering", allocatedGHS: 3_000, spentGHS: 1_500 },
    ]);

    expect(summary.totalAllocatedGHS).toBe(7_000);
    expect(summary.totalSpentGHS).toBe(5_500);
    expect(summary.unallocatedGHS).toBe(3_000);
    expect(summary.remainingGHS).toBe(4_500);
    // toBeCloseTo, not toBe: percentSpent is computed via floating-point
    // division (5500 / 10000 * 100), which lands on 55.00000000000001 in
    // JS, not exactly 55. This is the same float-rounding behavior noted
    // in LEARNING.md #4 as the reason we'd switch to integer minor units
    // for anything handling real payments instead of estimates.
    expect(summary.percentSpent).toBeCloseTo(55);

    const venue = summary.categories.find((c) => c.id === "1")!;
    expect(venue.percentOfTotalBudget).toBeCloseTo(40);
    expect(venue.remainingInCategory).toBe(0);
    expect(venue.isOverBudget).toBe(false);
  });

  it("flags a category as over budget once spending exceeds its allocation", () => {
    const summary = calculateBudgetSummary(5_000, [
      { id: "1", name: "Attire", allocatedGHS: 1_000, spentGHS: 1_200 },
    ]);

    const attire = summary.categories[0];
    expect(attire.isOverBudget).toBe(true);
    expect(attire.remainingInCategory).toBe(-200);
  });

  it("returns 0% instead of NaN/Infinity when totalBudgetGHS is 0", () => {
    const summary = calculateBudgetSummary(0, [
      { id: "1", name: "Venue", allocatedGHS: 500, spentGHS: 0 },
    ]);

    expect(summary.percentSpent).toBe(0);
    expect(summary.categories[0].percentOfTotalBudget).toBe(0);
  });

  it("tolerates extra fields on the input (e.g. TraditionalCeremonyItem's category/done) — the Traditional Ceremony page reuses this unchanged for per-item math", () => {
    const items = [
      { id: "1", name: "Kente cloth", allocatedGHS: 3_000, spentGHS: 3_000, category: "Kente & Cloth", done: true },
      { id: "2", name: "Engagement ring", allocatedGHS: 8_000, spentGHS: 4_000, category: "Jewelry", done: false },
    ];
    const summary = calculateBudgetSummary(25_000, items);

    expect(summary.totalSpentGHS).toBe(7_000);
    const ring = summary.categories.find((c) => c.id === "2")!;
    expect(ring.remainingInCategory).toBe(4_000);
    expect(ring.isOverBudget).toBe(false);
  });
});
