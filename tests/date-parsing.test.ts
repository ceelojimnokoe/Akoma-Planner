// tests/date-parsing.test.ts
//
// parseRelativeDate (lib/date-parsing.ts) powers BisaAI's RESCHEDULE
// command ("move my cake tasting to next Saturday"). Always takes an
// explicit reference date so these cases are deterministic regardless of
// when the suite runs.

import { describe, expect, it } from "vitest";
import { parseRelativeDate } from "@/lib/date-parsing";

// A fixed Wednesday, 2026-07-15.
const REFERENCE = new Date(2026, 6, 15);

describe("parseRelativeDate", () => {
  it("parses 'today'", () => {
    expect(parseRelativeDate("today", REFERENCE)).toEqual(new Date(2026, 6, 15));
  });

  it("parses 'tomorrow'", () => {
    expect(parseRelativeDate("tomorrow", REFERENCE)).toEqual(new Date(2026, 6, 16));
  });

  it("parses 'next Saturday' as the coming Saturday, not today", () => {
    // REFERENCE is a Wednesday — next Saturday is 3 days later.
    expect(parseRelativeDate("next Saturday", REFERENCE)).toEqual(new Date(2026, 6, 18));
  });

  it("'next <today's weekday>' skips to the following week, not today", () => {
    // REFERENCE is a Wednesday.
    expect(parseRelativeDate("next Wednesday", REFERENCE)).toEqual(new Date(2026, 6, 22));
  });

  it("parses 'in N days'", () => {
    expect(parseRelativeDate("in 3 days", REFERENCE)).toEqual(new Date(2026, 6, 18));
  });

  it("parses 'in N weeks'", () => {
    expect(parseRelativeDate("in 2 weeks", REFERENCE)).toEqual(new Date(2026, 6, 29));
  });

  it("is case-insensitive", () => {
    expect(parseRelativeDate("TOMORROW", REFERENCE)).toEqual(new Date(2026, 6, 16));
  });

  it("falls back to Date.parse for an absolute-ish phrase", () => {
    const result = parseRelativeDate("August 1, 2026", REFERENCE);
    expect(result).not.toBeNull();
    expect(result?.getMonth()).toBe(7);
    expect(result?.getDate()).toBe(1);
  });

  it("returns null for an unparseable phrase", () => {
    expect(parseRelativeDate("whenever works I guess", REFERENCE)).toBeNull();
  });

  it("returns null for an empty phrase", () => {
    expect(parseRelativeDate("", REFERENCE)).toBeNull();
  });
});
