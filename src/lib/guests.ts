// src/lib/guests.ts
//
// The one place "how many people is that, really?" gets answered. Before
// this file existed, guests.length / guests.filter(...).length was
// hand-rolled independently in six different places — every one of them
// counting guest *records*, never attendees, so a guest with +1 checked
// was silently undercounted everywhere except the one badge on their row
// (see GuestRow.tsx). Every stat/chart in the app should read from this
// function instead of re-deriving counts itself.

export interface GuestForStats {
  rsvpStatus: "PENDING" | "YES" | "NO";
  plusOne: boolean;
}

export interface GuestStats {
  /** Guest rows, not attendees — this is what the Free-plan cap (lib/plan.ts) counts. */
  totalRecords: number;
  confirmedRecords: number;
  /** Guest rows still awaiting a response — what the Dashboard's Pending
   *  Guest Confirmations widget counts (a follow-up list is about who to
   *  contact, i.e. records, not the attendee headcount those records
   *  might eventually represent). */
  pendingRecords: number;
  /** Real headcount: every guest is 1 attendee, or 2 if plusOne is checked. */
  totalAttendees: number;
  confirmedAttendees: number;
  pendingAttendees: number;
  declinedAttendees: number;
}

const seatsFor = (guest: GuestForStats) => (guest.plusOne ? 2 : 1);

export function calculateGuestStats(guests: GuestForStats[]): GuestStats {
  const confirmed = guests.filter((g) => g.rsvpStatus === "YES");
  const pending = guests.filter((g) => g.rsvpStatus === "PENDING");
  const declined = guests.filter((g) => g.rsvpStatus === "NO");

  return {
    totalRecords: guests.length,
    confirmedRecords: confirmed.length,
    pendingRecords: pending.length,
    totalAttendees: guests.reduce((sum, g) => sum + seatsFor(g), 0),
    confirmedAttendees: confirmed.reduce((sum, g) => sum + seatsFor(g), 0),
    pendingAttendees: pending.reduce((sum, g) => sum + seatsFor(g), 0),
    declinedAttendees: declined.reduce((sum, g) => sum + seatsFor(g), 0),
  };
}

export interface PendingGuestFollowUp {
  id: string;
  name: string;
  rsvpStatus: "PENDING" | "YES" | "NO";
  createdAt: Date;
}

/** The Dashboard's Pending Guest Confirmations widget: which pending
 *  guests to surface for follow-up, and in what order. Ghana weddings
 *  don't currently track a per-guest RSVP deadline, so "longest pending"
 *  (oldest createdAt among still-PENDING guests) is the best actionable
 *  proxy available — whoever's been waiting longest surfaces first. If a
 *  per-guest deadline field is ever added, prefer that over createdAt
 *  here without changing this function's shape. */
export function selectPendingGuestFollowUps<T extends PendingGuestFollowUp>(guests: T[], limit: number): T[] {
  return guests
    .filter((g) => g.rsvpStatus === "PENDING")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, limit);
}
