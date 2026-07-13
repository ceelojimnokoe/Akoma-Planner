// src/lib/vendor-booking-progress.ts
//
// Single source of truth for VendorBookingProgress — labels, tones, the
// ordinal rank used to pick "the most-advanced interest," and the
// best-guess bridge from the vendor catalog's VendorCategory (10 values)
// to the onboarding self-report's OnboardingVendorCategory (12 values).
// Same "one lookup, many call sites" convention as lib/guest-group.ts.
//
// Badge.tsx only has 5 tones for 7 statuses, so ENQUIRY_SENT/
// MEETING_SCHEDULED/NEGOTIATING share gold (all three mean "actively
// working on it," matching gold's existing "in progress" connotation
// elsewhere in this app) — acceptable since every label also carries a
// unique emoji, so no two statuses are ever visually identical even
// where their badge tone repeats.

import type { OnboardingVendorCategory, VendorBookingProgress, VendorCategory } from "@prisma/client";
import type { Tone } from "@/components/ui/Badge";

export const VENDOR_PROGRESS_LABEL: Record<VendorBookingProgress, string> = {
  NOT_CONTACTED: "⚪ Not Contacted",
  SHORTLISTED: "🔵 Shortlisted",
  ENQUIRY_SENT: "🟡 Enquiry Sent",
  MEETING_SCHEDULED: "🟠 Meeting Scheduled",
  NEGOTIATING: "🟣 Negotiating",
  BOOKED: "🟢 Booked",
  NOT_SELECTED: "❌ Not Selected",
};

export const VENDOR_PROGRESS_TONE: Record<VendorBookingProgress, Tone> = {
  NOT_CONTACTED: "neutral",
  SHORTLISTED: "info",
  ENQUIRY_SENT: "gold",
  MEETING_SCHEDULED: "gold",
  NEGOTIATING: "gold",
  BOOKED: "green",
  NOT_SELECTED: "terracotta",
};

// Every status except NOT_SELECTED, in forward-progress order — the
// segmented control and the progress timeline both iterate this. Typed
// to exclude NOT_SELECTED (not just documented to) so indexing
// PROGRESS_RANK by a value from this array type-checks without a cast.
export const VENDOR_PROGRESS_FORWARD_ORDER: Exclude<VendorBookingProgress, "NOT_SELECTED">[] = [
  "NOT_CONTACTED",
  "SHORTLISTED",
  "ENQUIRY_SENT",
  "MEETING_SCHEDULED",
  "NEGOTIATING",
  "BOOKED",
];

// Every filterable status the Vendor Filters UI offers, per spec — NOT_SELECTED
// deliberately excluded as a filter (filtering *for* rejected vendors isn't
// a useful browsing mode).
export const VENDOR_PROGRESS_FILTER_OPTIONS: VendorBookingProgress[] = [
  "BOOKED",
  "SHORTLISTED",
  "ENQUIRY_SENT",
  "NEGOTIATING",
  "MEETING_SCHEDULED",
  "NOT_CONTACTED",
];

/** Ordinal rank for "pick the most-advanced interest in a category."
 *  NOT_SELECTED deliberately has no slot — it's an off-path terminal
 *  state, not a point on the forward-progress scale. Never rely on enum
 *  declaration order for this comparison — SQLite has no native enums;
 *  Prisma simulates them as checked strings with zero ordinal guarantee. */
export const PROGRESS_RANK: Record<Exclude<VendorBookingProgress, "NOT_SELECTED">, number> = {
  NOT_CONTACTED: 0,
  SHORTLISTED: 1,
  ENQUIRY_SENT: 2,
  MEETING_SCHEDULED: 3,
  NEGOTIATING: 4,
  BOOKED: 5,
};

/** The Dashboard's per-category cell, the Collaboration page's vendor
 *  section, and BisaAI's context all need one answer to "who's the
 *  current vendor for this category?" — pure so it's testable without a
 *  database. Prefers a BOOKED interest (tie-broken by most recent
 *  update, since no DB constraint stops two rows both reaching BOOKED —
 *  see server/actions/vendor-booking.ts's transaction comment); falls
 *  back to the highest-ranked non-NOT_SELECTED interest; falls back
 *  further to the most recent NOT_SELECTED one so "we tried three and
 *  struck out" stays visible instead of reading as untouched. */
export function pickMostAdvancedInterest<T extends { bookingProgress: VendorBookingProgress; updatedAt: Date }>(
  interests: T[]
): T | null {
  if (interests.length === 0) return null;

  const booked = interests.filter((i) => i.bookingProgress === "BOOKED");
  if (booked.length > 0) {
    return booked.reduce((latest, i) => (i.updatedAt > latest.updatedAt ? i : latest));
  }

  const active = interests.filter((i) => i.bookingProgress !== "NOT_SELECTED");
  if (active.length > 0) {
    return active.reduce((best, i) => {
      const iRank = PROGRESS_RANK[i.bookingProgress as Exclude<VendorBookingProgress, "NOT_SELECTED">];
      const bestRank = PROGRESS_RANK[best.bookingProgress as Exclude<VendorBookingProgress, "NOT_SELECTED">];
      return iRank > bestRank ? i : best;
    });
  }

  return interests.reduce((latest, i) => (i.updatedAt > latest.updatedAt ? i : latest));
}

export type DerivedBookingStatus = "NOT_STARTED" | "RESEARCHING" | "BOOKED";

/** Decision 3's derived-aggregate rule for the legacy VendorBookingStatus
 *  mirror: BOOKED wins outright; any other real progress (including
 *  NOT_SELECTED — a category where every vendor said no is "stuck," not
 *  "not started," and must not silently read as idle) means RESEARCHING;
 *  otherwise NOT_STARTED. NOT_CONTACTED entries don't count as "real
 *  progress" on their own. */
export function deriveCategoryBookingStatus(progresses: VendorBookingProgress[]): DerivedBookingStatus {
  if (progresses.some((p) => p === "BOOKED")) return "BOOKED";
  if (progresses.some((p) => p !== "NOT_CONTACTED")) return "RESEARCHING";
  return "NOT_STARTED";
}

/** Best-guess bridge from a vendor's own catalog category to the
 *  onboarding taxonomy's closest equivalent — used only to pre-fill the
 *  editable "Which category is this for?" dropdown, never written
 *  silently without the couple seeing/confirming it. ATTIRE guesses
 *  BRIDAL_WEAR (editable to GROOMS_WEAR via the dropdown — the same
 *  ambiguous-but-guessable pattern already used for PHOTOGRAPHY→
 *  PHOTOGRAPHER). OTHER is the only remaining true "no equivalent"
 *  case, returning null — matches lib/budget-fit.ts's own "no match, no
 *  crash" convention. */
export function guessOnboardingCategory(vendorCategory: VendorCategory): OnboardingVendorCategory | null {
  const guesses: Record<VendorCategory, OnboardingVendorCategory | null> = {
    VENUE: "VENUE",
    CATERING: "CATERER",
    PHOTOGRAPHY: "PHOTOGRAPHER",
    ATTIRE: "BRIDAL_WEAR",
    DECOR: "DECOR",
    MUSIC: "DJ_BAND",
    MAKEUP: "MAKEUP",
    TRANSPORT: "TRANSPORTATION",
    CAKE: "CAKE",
    OTHER: null,
    JEWELLERY: "JEWELLERY",
    MC: "MC",
    PLANNER: "PLANNER",
  };
  return guesses[vendorCategory];
}
