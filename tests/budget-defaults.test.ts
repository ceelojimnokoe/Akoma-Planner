// tests/budget-defaults.test.ts
//
// buildDefaultBudgetCategories() derives its 16 rows (the 14 standardized
// vendor categories, plus Accommodation and Traditional Customary) directly
// from ONBOARDING_VENDOR_CATEGORIES rather than an independently hand-typed
// list — this guards that the two never drift apart, and that every row
// starts zero-filled (the "—" placeholder philosophy, not a guessed
// percentage split of the total budget).

import { describe, expect, it } from "vitest";
import { buildDefaultBudgetCategories } from "@/lib/budget-defaults";
import { ONBOARDING_VENDOR_CATEGORIES } from "@/lib/validation/wedding";

describe("buildDefaultBudgetCategories", () => {
  it("returns one row per onboarding category plus Accommodation and Traditional Customary", () => {
    const categories = buildDefaultBudgetCategories();
    expect(categories).toHaveLength(ONBOARDING_VENDOR_CATEGORIES.length + 2);
  });

  it("names every row after ONBOARDING_VENDOR_CATEGORIES' labels, plus Accommodation and Traditional Customary", () => {
    const categories = buildDefaultBudgetCategories();
    const names = categories.map((c) => c.name);
    for (const c of ONBOARDING_VENDOR_CATEGORIES) {
      expect(names).toContain(c.label);
    }
    expect(names).toContain("Accommodation");
    expect(names).toContain("Traditional Customary");
  });

  it("starts every row at zero — the couple fills in real numbers themselves", () => {
    const categories = buildDefaultBudgetCategories();
    expect(categories.every((c) => c.allocatedGHS === 0)).toBe(true);
    expect(categories.every((c) => c.spentGHS === 0)).toBe(true);
  });
});
