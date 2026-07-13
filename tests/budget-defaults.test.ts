// tests/budget-defaults.test.ts
//
// Guards the default budget split's own invariant: percentages must sum
// to exactly 100, or a fresh wedding plan's categories silently
// over/under-allocate the couple's total budget. Worth a regression test
// specifically because Accommodation was just inserted by hand-adjusting
// every other entry's percentage.

import { describe, expect, it } from "vitest";
import { DEFAULT_BUDGET_SPLIT, buildDefaultBudgetCategories } from "@/lib/budget-defaults";

describe("DEFAULT_BUDGET_SPLIT", () => {
  it("sums to exactly 100%", () => {
    const total = DEFAULT_BUDGET_SPLIT.reduce((sum, entry) => sum + entry.percentOfBudget, 0);
    expect(total).toBe(100);
  });

  it("includes Accommodation as a real category", () => {
    expect(DEFAULT_BUDGET_SPLIT.some((entry) => entry.name === "Accommodation")).toBe(true);
  });
});

describe("buildDefaultBudgetCategories", () => {
  it("allocates the full total budget across all categories, none spent yet", () => {
    const categories = buildDefaultBudgetCategories(100_000);
    const totalAllocated = categories.reduce((sum, c) => sum + c.allocatedGHS, 0);
    expect(totalAllocated).toBe(100_000);
    expect(categories.every((c) => c.spentGHS === 0)).toBe(true);
  });

  it("gives Accommodation a real, non-zero allocation", () => {
    const categories = buildDefaultBudgetCategories(100_000);
    const accommodation = categories.find((c) => c.name === "Accommodation");
    expect(accommodation).toBeDefined();
    expect(accommodation!.allocatedGHS).toBeGreaterThan(0);
  });
});
