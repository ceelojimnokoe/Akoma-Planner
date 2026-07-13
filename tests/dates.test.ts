// tests/dates.test.ts
//
// getMonthGrid() has fiddly month-boundary math (leading/trailing days
// from adjacent months) — exactly the kind of pure function worth a test
// before trusting it in the calendar UI.

import { describe, expect, it } from "vitest";
import { getMonthGrid, getWeekDays, isSameDay } from "@/lib/dates";

describe("getMonthGrid", () => {
  it("starts the grid on the Monday before the 1st of the month", () => {
    // February 2026 starts on a Sunday.
    const weeks = getMonthGrid(2026, 1);
    const firstDay = weeks[0][0];
    expect(firstDay.getDay()).toBe(1); // Monday
    expect(firstDay <= new Date(2026, 1, 1)).toBe(true);
  });

  it("includes every day of the month exactly once", () => {
    const weeks = getMonthGrid(2026, 1); // February 2026, 28 days
    const daysInFebruary = weeks.flat().filter((d) => d.getMonth() === 1);
    expect(daysInFebruary).toHaveLength(28);
    expect(daysInFebruary[0].getDate()).toBe(1);
    expect(daysInFebruary[daysInFebruary.length - 1].getDate()).toBe(28);
  });

  it("every week has exactly 7 days and grid has no gaps between weeks", () => {
    const weeks = getMonthGrid(2026, 6); // July 2026
    for (const week of weeks) expect(week).toHaveLength(7);
    const allDays = weeks.flat();
    for (let i = 1; i < allDays.length; i++) {
      expect(allDays[i].getTime() - allDays[i - 1].getTime()).toBe(24 * 60 * 60 * 1000);
    }
  });

  it("handles December -> January year rollover in the trailing days", () => {
    const weeks = getMonthGrid(2026, 11); // December 2026
    const lastWeek = weeks[weeks.length - 1];
    const trailingIntoJanuary = lastWeek.filter((d) => d.getMonth() === 0);
    for (const d of trailingIntoJanuary) expect(d.getFullYear()).toBe(2027);
  });
});

describe("getWeekDays", () => {
  it("returns 7 days starting on Monday", () => {
    const wednesday = new Date(2026, 6, 15); // July 15, 2026 is a Wednesday
    const week = getWeekDays(wednesday);
    expect(week).toHaveLength(7);
    expect(week[0].getDay()).toBe(1); // Monday
    expect(week[6].getDay()).toBe(0); // Sunday
  });

  it("includes the original date somewhere in the week", () => {
    const wednesday = new Date(2026, 6, 15);
    const week = getWeekDays(wednesday);
    expect(week.some((d) => isSameDay(d, wednesday))).toBe(true);
  });

  it("handles a month rollover correctly", () => {
    // July 31, 2026 is a Friday — its week spans into August.
    const fridayEndOfMonth = new Date(2026, 6, 31);
    const week = getWeekDays(fridayEndOfMonth);
    expect(week[0]).toEqual(new Date(2026, 6, 27)); // Monday July 27
    expect(week[6]).toEqual(new Date(2026, 7, 2)); // Sunday August 2
  });

  it("returns consecutive days with no gaps", () => {
    const week = getWeekDays(new Date(2026, 6, 15));
    for (let i = 1; i < week.length; i++) {
      expect(week[i].getTime() - week[i - 1].getTime()).toBe(24 * 60 * 60 * 1000);
    }
  });
});

describe("isSameDay", () => {
  it("ignores time-of-day when comparing", () => {
    const a = new Date(2026, 5, 15, 3, 0);
    const b = new Date(2026, 5, 15, 23, 45);
    expect(isSameDay(a, b)).toBe(true);
  });

  it("returns false for different days", () => {
    expect(isSameDay(new Date(2026, 5, 15), new Date(2026, 5, 16))).toBe(false);
  });
});
