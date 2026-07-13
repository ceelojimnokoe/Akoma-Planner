// tests/checklist-tone.test.ts
//
// getChecklistTone mirrors lib/budget-tone.ts's pattern but inverted
// (higher percent = better, not worse) — guards the exact threshold
// boundaries the spec calls for: 0-30% red, 31-69% yellow, 70-100% green.

import { describe, expect, it } from "vitest";
import { getChecklistTone } from "@/lib/checklist-tone";

describe("getChecklistTone", () => {
  it.each([
    [0, "terracotta"],
    [30, "terracotta"],
    [31, "gold"],
    [50, "gold"],
    [69, "gold"],
    [70, "green"],
    [85, "green"],
    [100, "green"],
  ] as const)("%i%% -> %s", (percent, tone) => {
    expect(getChecklistTone(percent)).toBe(tone);
  });
});
