// tests/budget-fit.test.ts
//
// Pure matching/comparison logic behind the vendor & accommodation
// "fits your budget" indicator and the "Within my budget" filter.

import { describe, expect, it } from "vitest";
import { getBudgetFit, matchBudgetCategoryByName, matchVendorBudgetCategory } from "@/lib/budget-fit";

const CATEGORIES = [
  { name: "Venue", allocatedGHS: 30_000 },
  { name: "Photography & Media", allocatedGHS: 10_000 },
  { name: "Accommodation", allocatedGHS: 7_000 },
];

describe("matchVendorBudgetCategory", () => {
  it("matches VENUE to the 'Venue' category", () => {
    expect(matchVendorBudgetCategory("VENUE", CATEGORIES)?.name).toBe("Venue");
  });

  it("matches PHOTOGRAPHY to a compound-named category via keyword", () => {
    expect(matchVendorBudgetCategory("PHOTOGRAPHY", CATEGORIES)?.name).toBe("Photography & Media");
  });

  it("returns null when no category matches", () => {
    expect(matchVendorBudgetCategory("CAKE", CATEGORIES)).toBeNull();
  });

  it("returns null for categories with no sensible default mapping (MAKEUP)", () => {
    expect(matchVendorBudgetCategory("MAKEUP", CATEGORIES)).toBeNull();
  });

  it("is case-insensitive and matches a renamed category", () => {
    const renamed = [{ name: "our VENUE fund", allocatedGHS: 5_000 }];
    expect(matchVendorBudgetCategory("VENUE", renamed)?.name).toBe("our VENUE fund");
  });
});

describe("matchBudgetCategoryByName", () => {
  it("matches the literal Accommodation category", () => {
    expect(matchBudgetCategoryByName("Accommodation", CATEGORIES)?.name).toBe("Accommodation");
  });

  it("returns null when the couple has no matching category", () => {
    expect(matchBudgetCategoryByName("Accommodation", [{ name: "Venue", allocatedGHS: 1000 }])).toBeNull();
  });
});

describe("getBudgetFit", () => {
  it("fits when the price is at or under the allocation", () => {
    const result = getBudgetFit(6_500, { name: "Accommodation", allocatedGHS: 7_000 });
    expect(result.fits).toBe(true);
    expect(result.label).toBe("Fits within your allocated budget");
  });

  it("fits exactly at the allocation boundary", () => {
    expect(getBudgetFit(7_000, { name: "Accommodation", allocatedGHS: 7_000 }).fits).toBe(true);
  });

  it("exceeds when the price is over the allocation, with the overage in the label", () => {
    const result = getBudgetFit(9_000, { name: "Accommodation", allocatedGHS: 7_000 });
    expect(result.fits).toBe(false);
    expect(result.label).toContain("Exceeds your allocated budget by");
  });
});
