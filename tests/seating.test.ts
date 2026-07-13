// tests/seating.test.ts
//
// computeSeatingArrangement is the pure algorithm behind both the
// seating chart's first-visit seed and its "Guests per table" repack —
// same pattern as tests/checklist-sort.test.ts: build plain fixtures
// matching the lib's own input shape, assert on the returned placements.

import { describe, expect, it } from "vitest";
import { computeSeatingArrangement, type SeatableGuest } from "@/lib/seating";

function guest(id: string, overrides: Partial<SeatableGuest> = {}): SeatableGuest {
  return { id, name: id, side: "BRIDE", guestGroup: null, plusOne: false, ...overrides };
}

function tableOf(placements: ReturnType<typeof computeSeatingArrangement>, guestId: string) {
  return placements.find((p) => p.guestId === guestId)?.tableNumber;
}

describe("computeSeatingArrangement", () => {
  it("returns an empty array for no guests", () => {
    expect(computeSeatingArrangement([], 10)).toEqual([]);
  });

  it("seats everyone at table 1 when they all fit", () => {
    const guests = [guest("a"), guest("b"), guest("c")];
    const placements = computeSeatingArrangement(guests, 10);
    expect(placements).toHaveLength(3);
    expect(placements.every((p) => p.tableNumber === 1)).toBe(true);
  });

  it("never splits a guest's own +1 — they always share one table", () => {
    // tableSize smaller than the party's 2 seats: still placed as one
    // atomic unit rather than being torn across two tables.
    const guests = [guest("solo", { plusOne: true })];
    const placements = computeSeatingArrangement(guests, 1);
    expect(placements).toHaveLength(1);
    expect(placements[0].guestId).toBe("solo");
  });

  it("keeps a small guestGroup cluster together on one table", () => {
    const guests = [
      guest("bride1", { guestGroup: null, side: "BRIDE" }),
      guest("bride2", { guestGroup: null, side: "BRIDE" }),
      guest("bride3", { guestGroup: null, side: "BRIDE" }),
      guest("bride4", { guestGroup: null, side: "BRIDE" }),
      guest("bm1", { guestGroup: "BRIDESMAID" }),
      guest("bm2", { guestGroup: "BRIDESMAID" }),
      guest("bm3", { guestGroup: "BRIDESMAID" }),
      guest("bm4", { guestGroup: "BRIDESMAID" }),
    ];
    // tableSize 8: bride-side cluster (4) fills 4/8, leaving 4 remaining —
    // exactly enough for the 4 bridesmaids, but "keep together" logic
    // should not scatter them if they don't cleanly fit; here they do fit
    // (4 <= 8-4), so they land on the same table as each other regardless.
    const placements = computeSeatingArrangement(guests, 8);
    const bmTables = new Set(["bm1", "bm2", "bm3", "bm4"].map((id) => tableOf(placements, id)));
    expect(bmTables.size).toBe(1);
  });

  it("starts a fresh table for a cluster rather than splitting it to fill leftover seats", () => {
    const brideFamily = Array.from({ length: 5 }, (_, i) => guest(`bf${i}`, { guestGroup: "BRIDE_FAMILY" }));
    const bridesmaids = Array.from({ length: 4 }, (_, i) => guest(`bm${i}`, { guestGroup: "BRIDESMAID" }));
    const placements = computeSeatingArrangement([...brideFamily, ...bridesmaids], 8);

    const bmTables = new Set(bridesmaids.map((g) => tableOf(placements, g.id)));
    expect(bmTables.size).toBe(1); // all 4 bridesmaids on the same table
    const bfTables = new Set(brideFamily.map((g) => tableOf(placements, g.id)));
    expect(bfTables.size).toBe(1); // all 5 bride's-family guests on the same table
    // and the two clusters landed on different tables, since 5+4=9 > 8
    expect([...bmTables][0]).not.toBe([...bfTables][0]);
  });

  it("splits an oversized cluster across consecutive tables without breaking any party", () => {
    const guests = Array.from({ length: 12 }, (_, i) => guest(`g${i}`, { guestGroup: "GROOM_FAMILY" }));
    const placements = computeSeatingArrangement(guests, 5);

    expect(placements).toHaveLength(12);
    const uniqueGuestIds = new Set(placements.map((p) => p.guestId));
    expect(uniqueGuestIds.size).toBe(12); // nobody duplicated or dropped

    const tableNumbers = [...new Set(placements.map((p) => p.tableNumber))].sort((a, b) => a - b);
    expect(tableNumbers).toEqual([1, 2, 3]); // ceil(12/5) = 3 consecutive tables

    const counts = tableNumbers.map((t) => placements.filter((p) => p.tableNumber === t).length);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(12);
    expect(counts.every((c) => c <= 5)).toBe(true);
  });

  it("falls back to side clustering for guests with no guestGroup", () => {
    const guests = [
      guest("bride1", { side: "BRIDE" }),
      guest("bride2", { side: "BRIDE" }),
      guest("groom1", { side: "GROOM" }),
      guest("groom2", { side: "GROOM" }),
    ];
    const placements = computeSeatingArrangement(guests, 2);
    expect(tableOf(placements, "bride1")).toBe(tableOf(placements, "bride2"));
    expect(tableOf(placements, "groom1")).toBe(tableOf(placements, "groom2"));
    expect(tableOf(placements, "bride1")).not.toBe(tableOf(placements, "groom1"));
  });
});
