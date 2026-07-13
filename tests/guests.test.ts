// tests/guests.test.ts
//
// Same pattern as budget.test.ts: a pure function, plain data in, plain
// data out. Worth testing directly since the whole point of centralizing
// this logic (see LEARNING.md) was that it was getting the +1 math wrong
// in six different places before.

import { describe, expect, it } from "vitest";
import { calculateGuestStats, selectPendingGuestFollowUps } from "@/lib/guests";

describe("calculateGuestStats", () => {
  it("counts a guest with plusOne as 2 attendees, not 1", () => {
    const stats = calculateGuestStats([
      { rsvpStatus: "YES", plusOne: true },
      { rsvpStatus: "YES", plusOne: false },
    ]);

    expect(stats.totalRecords).toBe(2);
    expect(stats.totalAttendees).toBe(3);
    expect(stats.confirmedAttendees).toBe(3);
  });

  it("splits attendee counts correctly across confirmed/pending/declined", () => {
    const stats = calculateGuestStats([
      { rsvpStatus: "YES", plusOne: true }, // 2
      { rsvpStatus: "PENDING", plusOne: false }, // 1
      { rsvpStatus: "PENDING", plusOne: true }, // 2
      { rsvpStatus: "NO", plusOne: false }, // 1
    ]);

    expect(stats.totalRecords).toBe(4);
    expect(stats.confirmedRecords).toBe(1);
    expect(stats.pendingRecords).toBe(2);
    expect(stats.totalAttendees).toBe(6);
    expect(stats.confirmedAttendees).toBe(2);
    expect(stats.pendingAttendees).toBe(3);
    expect(stats.declinedAttendees).toBe(1);
  });

  it("returns all zeroes for an empty guest list", () => {
    const stats = calculateGuestStats([]);
    expect(stats).toEqual({
      totalRecords: 0,
      confirmedRecords: 0,
      pendingRecords: 0,
      totalAttendees: 0,
      confirmedAttendees: 0,
      pendingAttendees: 0,
      declinedAttendees: 0,
    });
  });
});

describe("selectPendingGuestFollowUps", () => {
  const guest = (id: string, rsvpStatus: "PENDING" | "YES" | "NO", daysAgo: number) => ({
    id,
    name: id,
    rsvpStatus,
    createdAt: new Date(Date.now() - daysAgo * 86_400_000),
  });

  it("excludes confirmed and declined guests", () => {
    const result = selectPendingGuestFollowUps(
      [guest("a", "YES", 10), guest("b", "PENDING", 5), guest("c", "NO", 20)],
      5
    );
    expect(result.map((g) => g.id)).toEqual(["b"]);
  });

  it("orders the longest-pending guest first", () => {
    const result = selectPendingGuestFollowUps(
      [guest("recent", "PENDING", 1), guest("oldest", "PENDING", 30), guest("middle", "PENDING", 10)],
      5
    );
    expect(result.map((g) => g.id)).toEqual(["oldest", "middle", "recent"]);
  });

  it("respects the limit", () => {
    const result = selectPendingGuestFollowUps(
      [guest("a", "PENDING", 1), guest("b", "PENDING", 2), guest("c", "PENDING", 3)],
      2
    );
    expect(result).toHaveLength(2);
  });

  it("returns an empty array when nobody is pending", () => {
    const result = selectPendingGuestFollowUps([guest("a", "YES", 1), guest("b", "NO", 2)], 5);
    expect(result).toEqual([]);
  });
});
