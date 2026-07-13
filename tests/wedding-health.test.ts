// tests/wedding-health.test.ts
//
// getWeddingHealthScore combines four already-computed summaries into
// one score — tested the same way as tests/guests.test.ts, building a
// baseline fixture and overriding one field per test so each sub-score's
// boundary behavior is isolated.

import { describe, expect, it } from "vitest";
import { getWeddingHealthScore, type WeddingHealthInput } from "@/lib/wedding-health";

function buildInput(overrides: Partial<WeddingHealthInput> = {}): WeddingHealthInput {
  return {
    checklistPercent: 50,
    weddingPlanCreatedAt: new Date(2026, 0, 1),
    weddingDate: new Date(2026, 11, 1), // ~334 days out
    budgetPercentSpent: 30,
    budgetRemainingGHS: 50_000,
    vendorsBookedCount: 6,
    vendorsTotalCount: 12,
    guestsConfirmedAttendees: 50,
    guestsTotalAttendees: 100,
    today: new Date(2026, 5, 1), // roughly the halfway point
    ...overrides,
  };
}

describe("getWeddingHealthScore — timeline sub-score", () => {
  it("scores 75 ('On pace') when checklist completion exactly matches elapsed time", () => {
    // createdAt Jan 1, wedding Dec 31 (365 days), today ~half way -> ~50% elapsed
    const result = getWeddingHealthScore(
      buildInput({
        weddingPlanCreatedAt: new Date(2026, 0, 1),
        weddingDate: new Date(2027, 0, 1),
        today: new Date(2026, 6, 2), // ~50% through the year
        checklistPercent: 50,
      })
    );
    expect(result.timeline.score).toBeCloseTo(75, 0);
    expect(result.timeline.label).toBe("On pace");
  });

  it("scores above baseline and labels 'Ahead of schedule' when well ahead of pace", () => {
    const result = getWeddingHealthScore(
      buildInput({
        weddingPlanCreatedAt: new Date(2026, 0, 1),
        weddingDate: new Date(2027, 0, 1),
        today: new Date(2026, 6, 2), // ~50% elapsed
        checklistPercent: 80, // 30 points ahead
      })
    );
    expect(result.timeline.score).toBe(100); // clamped
    expect(result.timeline.label).toBe("Ahead of schedule");
  });

  it("scores below baseline and labels 'Behind schedule' when well behind pace", () => {
    const result = getWeddingHealthScore(
      buildInput({
        weddingPlanCreatedAt: new Date(2026, 0, 1),
        weddingDate: new Date(2027, 0, 1),
        today: new Date(2026, 6, 2), // ~50% elapsed
        checklistPercent: 10, // 40 points behind
      })
    );
    expect(result.timeline.score).toBeCloseTo(35, 0);
    expect(result.timeline.label).toBe("Behind schedule");
  });

  it("never goes below 0 even when drastically behind", () => {
    const result = getWeddingHealthScore(
      buildInput({
        weddingPlanCreatedAt: new Date(2026, 0, 1),
        weddingDate: new Date(2027, 0, 1),
        today: new Date(2026, 11, 30), // ~100% elapsed
        checklistPercent: 0,
      })
    );
    expect(result.timeline.score).toBe(0);
  });
});

describe("getWeddingHealthScore — budget sub-score", () => {
  it("labels 'Healthy' in the green band", () => {
    const result = getWeddingHealthScore(buildInput({ budgetPercentSpent: 30, budgetRemainingGHS: 10_000 }));
    expect(result.budget.score).toBe(95);
    expect(result.budget.label).toBe("Healthy");
  });

  it("labels 'On track' in the gold band", () => {
    const result = getWeddingHealthScore(buildInput({ budgetPercentSpent: 70, budgetRemainingGHS: 10_000 }));
    expect(result.budget.score).toBe(75);
    expect(result.budget.label).toBe("On track");
  });

  it("labels 'Watch spending' in the terracotta band while still under total budget", () => {
    const result = getWeddingHealthScore(buildInput({ budgetPercentSpent: 90, budgetRemainingGHS: 5_000 }));
    expect(result.budget.score).toBe(50);
    expect(result.budget.label).toBe("Watch spending");
  });

  it("labels 'Over budget' and scores worst once the total budget is actually exceeded", () => {
    const result = getWeddingHealthScore(buildInput({ budgetPercentSpent: 60, budgetRemainingGHS: -1_000 }));
    expect(result.budget.score).toBe(15);
    expect(result.budget.label).toBe("Over budget");
  });
});

describe("getWeddingHealthScore — vendor sub-score", () => {
  it("computes a percentage and a 'booked/total' label", () => {
    const result = getWeddingHealthScore(buildInput({ vendorsBookedCount: 7, vendorsTotalCount: 10 }));
    expect(result.vendors.score).toBeCloseTo(70, 0);
    expect(result.vendors.label).toBe("7/10 booked");
  });

  it("doesn't penalize a wedding with zero tracked vendor categories", () => {
    const result = getWeddingHealthScore(buildInput({ vendorsBookedCount: 0, vendorsTotalCount: 0 }));
    expect(result.vendors.score).toBe(100);
  });
});

describe("getWeddingHealthScore — guest sub-score", () => {
  it("computes a percentage and a '% confirmed' label", () => {
    const result = getWeddingHealthScore(buildInput({ guestsConfirmedAttendees: 76, guestsTotalAttendees: 100 }));
    expect(result.guests.score).toBe(76);
    expect(result.guests.label).toBe("76% confirmed");
  });

  it("doesn't penalize a wedding with zero invited guests yet", () => {
    const result = getWeddingHealthScore(buildInput({ guestsConfirmedAttendees: 0, guestsTotalAttendees: 0 }));
    expect(result.guests.score).toBe(100);
  });
});

describe("getWeddingHealthScore — overall score and status bands", () => {
  it("labels 🟢 On Track at 80+", () => {
    const result = getWeddingHealthScore(
      buildInput({
        weddingPlanCreatedAt: new Date(2026, 0, 1),
        weddingDate: new Date(2027, 0, 1),
        today: new Date(2026, 6, 2),
        checklistPercent: 80,
        budgetPercentSpent: 30,
        budgetRemainingGHS: 10_000,
        vendorsBookedCount: 10,
        vendorsTotalCount: 10,
        guestsConfirmedAttendees: 90,
        guestsTotalAttendees: 100,
      })
    );
    expect(result.status).toBe("on-track");
    expect(result.statusLabel).toBe("🟢 On Track");
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("labels 🔴 At Risk when every signal is poor", () => {
    const result = getWeddingHealthScore(
      buildInput({
        weddingPlanCreatedAt: new Date(2026, 0, 1),
        weddingDate: new Date(2027, 0, 1),
        today: new Date(2026, 11, 30),
        checklistPercent: 5,
        budgetPercentSpent: 100,
        budgetRemainingGHS: -5_000,
        vendorsBookedCount: 1,
        vendorsTotalCount: 12,
        guestsConfirmedAttendees: 5,
        guestsTotalAttendees: 100,
      })
    );
    expect(result.status).toBe("at-risk");
    expect(result.statusLabel).toBe("🔴 At Risk");
    expect(result.score).toBeLessThan(55);
  });

  it("labels 🟡 Needs Attention in the middle band", () => {
    const result = getWeddingHealthScore(
      buildInput({
        weddingPlanCreatedAt: new Date(2026, 0, 1),
        weddingDate: new Date(2027, 0, 1),
        today: new Date(2026, 6, 2),
        checklistPercent: 50, // roughly on pace
        budgetPercentSpent: 75,
        budgetRemainingGHS: 5_000,
        vendorsBookedCount: 6,
        vendorsTotalCount: 10,
        guestsConfirmedAttendees: 60,
        guestsTotalAttendees: 100,
      })
    );
    expect(result.status).toBe("needs-attention");
    expect(result.score).toBeGreaterThanOrEqual(55);
    expect(result.score).toBeLessThan(80);
  });
});
