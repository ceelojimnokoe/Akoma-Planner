// src/lib/seating.ts
//
// Pure seating-arrangement algorithm — no Prisma import, so it's
// trivially unit-testable without a database (same "pure logic in lib/"
// convention as lib/budget.ts, lib/guests.ts, lib/checklist-sort.ts).
// Replaces the old side-only greedy pack (previously duplicated between
// lib/bisaai.ts's mock and server/actions/seating.ts's real seed loop)
// with real grouping awareness: guests sharing a guestGroup (Bride's
// Family, Bridesmaid, etc.) cluster onto the same table where capacity
// allows, falling back to side for ungrouped guests. A guest's own +1
// is a single row/party and is never split across tables — it's placed
// as one atomic unit by construction (see the inner loop below).
//
// Still a greedy heuristic, not a real optimizer — same honesty as
// lib/bisaai.ts's seatingSuggestions() header comment ("not a real
// optimizer"). "Keep a group together" is prioritized over maximizing
// seat utilization: a cluster that doesn't fully fit in a table's
// remaining space starts a fresh table rather than being split to fill
// leftover seats, so a table can legitimately end up with empty seats
// after this runs. Couples can always manually rearrange afterward —
// this only has to produce a sensible starting point, not a final answer.

export interface SeatableGuest {
  id: string;
  name: string;
  side: "BRIDE" | "GROOM" | "BOTH";
  guestGroup: string | null;
  plusOne: boolean;
}

export interface SeatingPlacement {
  guestId: string;
  tableNumber: number;
}

function seatsFor(guest: SeatableGuest): number {
  return guest.plusOne ? 2 : 1;
}

function clusterKey(guest: SeatableGuest): string {
  return guest.guestGroup ?? `SIDE_${guest.side}`;
}

export function computeSeatingArrangement(guests: SeatableGuest[], tableSize: number): SeatingPlacement[] {
  if (guests.length === 0) return [];
  const size = Math.max(1, tableSize);

  const clusters = new Map<string, SeatableGuest[]>();
  for (const guest of guests) {
    const key = clusterKey(guest);
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(guest);
  }

  // Largest clusters first (packs more efficiently), ties broken by key
  // for determinism; members within a cluster sorted by name.
  const orderedClusters = [...clusters.entries()]
    .map(([key, members]) => [key, [...members].sort((a, b) => a.name.localeCompare(b.name))] as const)
    .sort((a, b) => {
      const seatsA = a[1].reduce((sum, g) => sum + seatsFor(g), 0);
      const seatsB = b[1].reduce((sum, g) => sum + seatsFor(g), 0);
      return seatsB - seatsA || a[0].localeCompare(b[0]);
    });

  const placements: SeatingPlacement[] = [];
  let tableNumber = 1;
  let seatsUsed = 0;

  for (const [, members] of orderedClusters) {
    const clusterSeats = members.reduce((sum, g) => sum + seatsFor(g), 0);

    // Whole cluster fits in the current table's remaining space -> stays
    // there. Otherwise, if the current table already has anyone in it,
    // start a fresh table for this cluster rather than splitting it just
    // to use up leftover seats.
    if (clusterSeats > size - seatsUsed && seatsUsed > 0) {
      tableNumber += 1;
      seatsUsed = 0;
    }

    for (const guest of members) {
      const seats = seatsFor(guest);
      // Only reached when a single cluster itself exceeds one table's
      // capacity — the one case that must split, since no table could
      // ever hold it whole. Never splits a single guest's own party.
      if (seatsUsed > 0 && seatsUsed + seats > size) {
        tableNumber += 1;
        seatsUsed = 0;
      }
      placements.push({ guestId: guest.id, tableNumber });
      seatsUsed += seats;
    }
  }

  return placements;
}
