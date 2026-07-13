// tests/budget-tone.test.ts
//
// getRemainingTone specifically: grey before any spending, green once
// spending has started with room left, red once over budget.

import { describe, expect, it } from "vitest";
import { getBudgetTone, getRemainingTone } from "@/lib/budget-tone";

describe("getBudgetTone", () => {
  it.each([
    [0, "green"],
    [60, "green"],
    [61, "gold"],
    [80, "gold"],
    [81, "terracotta"],
    [120, "terracotta"],
  ] as const)("%i%% spent -> %s", (percentSpent, tone) => {
    expect(getBudgetTone(percentSpent)).toBe(tone);
  });
});

describe("getRemainingTone", () => {
  it("is neutral when nothing has been spent yet", () => {
    expect(getRemainingTone(0, 10_000)).toBe("neutral");
  });

  it("is green once spending has started and money remains", () => {
    expect(getRemainingTone(5_000, 5_000)).toBe("green");
  });

  it("is terracotta once over budget", () => {
    expect(getRemainingTone(12_000, -2_000)).toBe("terracotta");
  });

  it("is neutral even if remaining is 0, as long as nothing was spent (edge case: zero budget)", () => {
    expect(getRemainingTone(0, 0)).toBe("neutral");
  });
});
