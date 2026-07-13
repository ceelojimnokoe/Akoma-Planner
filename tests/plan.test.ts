// tests/plan.test.ts
//
// canSetGuestEstimate: a distinct gate from canAddGuest (which counts
// real Guest rows) — this one gates the couple's own estimate number
// when they edit it after onboarding.

import { describe, expect, it } from "vitest";
import { canSetGuestEstimate } from "@/lib/plan";

describe("canSetGuestEstimate", () => {
  it("allows a Free account up to the 100-guest cap", () => {
    expect(canSetGuestEstimate({ hasWeddingPass: false }, 100).allowed).toBe(true);
  });

  it("blocks a Free account above the cap with an upgrade reason", () => {
    const gate = canSetGuestEstimate({ hasWeddingPass: false }, 101);
    expect(gate.allowed).toBe(false);
    if (!gate.allowed) expect(gate.upgradeReason).toContain("Wedding Pass");
  });

  it("allows a Pass account any estimate", () => {
    expect(canSetGuestEstimate({ hasWeddingPass: true }, 5000).allowed).toBe(true);
  });
});
