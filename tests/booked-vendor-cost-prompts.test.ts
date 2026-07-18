// tests/booked-vendor-cost-prompts.test.ts

import { describe, expect, it } from "vitest";
import { findBookedVendorCostPrompts } from "@/lib/booked-vendor-cost-prompts";

describe("findBookedVendorCostPrompts", () => {
  it("prompts for a booked category with no recorded spend yet", () => {
    const results = findBookedVendorCostPrompts(
      [{ category: "PHOTOGRAPHER", status: "BOOKED" }],
      [{ id: "b1", name: "Photography", allocatedGHS: 8000, spentGHS: 0 }]
    );
    expect(results).toHaveLength(1);
    expect(results[0].matchedBudgetCategoryName).toBe("Photography");
  });

  it("does not prompt when a cost is already recorded", () => {
    const results = findBookedVendorCostPrompts(
      [{ category: "PHOTOGRAPHER", status: "BOOKED" }],
      [{ id: "b1", name: "Photography", allocatedGHS: 8000, spentGHS: 5000 }]
    );
    expect(results).toHaveLength(0);
  });

  it("does not prompt for a category that isn't booked", () => {
    const results = findBookedVendorCostPrompts(
      [{ category: "PHOTOGRAPHER", status: "RESEARCHING" }],
      [{ id: "b1", name: "Photography", allocatedGHS: 8000, spentGHS: 0 }]
    );
    expect(results).toHaveLength(0);
  });

  it("skips a booked category with no matching budget row (renamed/deleted)", () => {
    const results = findBookedVendorCostPrompts([{ category: "PHOTOGRAPHER", status: "BOOKED" }], []);
    expect(results).toHaveLength(0);
  });

  it("handles multiple booked categories independently", () => {
    const results = findBookedVendorCostPrompts(
      [
        { category: "PHOTOGRAPHER", status: "BOOKED" },
        { category: "VENUE", status: "BOOKED" },
        { category: "CATERER", status: "RESEARCHING" },
      ],
      [
        { id: "b1", name: "Photography", allocatedGHS: 8000, spentGHS: 0 },
        { id: "b2", name: "Venue", allocatedGHS: 20000, spentGHS: 15000 },
        { id: "b3", name: "Catering", allocatedGHS: 10000, spentGHS: 0 },
      ]
    );
    expect(results.map((r) => r.category)).toEqual(["PHOTOGRAPHER"]);
  });
});
