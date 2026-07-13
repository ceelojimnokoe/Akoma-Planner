// tests/vendor-booking-progress.test.ts
//
// The pure logic behind the whole Vendor Booking Management System:
// which vendor "wins" per category, how the legacy VendorBookingStatus
// mirror is derived, and the best-guess category bridge. Same pattern
// as tests/guests.test.ts — plain fixtures matching each function's own
// input shape, no database.

import { describe, expect, it } from "vitest";
import {
  deriveCategoryBookingStatus,
  guessOnboardingCategory,
  pickMostAdvancedInterest,
  PROGRESS_RANK,
  VENDOR_PROGRESS_FORWARD_ORDER,
} from "@/lib/vendor-booking-progress";
import type { VendorBookingProgress, VendorCategory } from "@prisma/client";

describe("guessOnboardingCategory", () => {
  it("maps every catalog category with a clear onboarding equivalent", () => {
    expect(guessOnboardingCategory("VENUE")).toBe("VENUE");
    expect(guessOnboardingCategory("CATERING")).toBe("CATERER");
    expect(guessOnboardingCategory("PHOTOGRAPHY")).toBe("PHOTOGRAPHER");
    expect(guessOnboardingCategory("DECOR")).toBe("DECOR");
    expect(guessOnboardingCategory("MUSIC")).toBe("DJ_BAND");
    expect(guessOnboardingCategory("MAKEUP")).toBe("MAKEUP");
    expect(guessOnboardingCategory("TRANSPORT")).toBe("TRANSPORTATION");
    expect(guessOnboardingCategory("CAKE")).toBe("CAKE");
    expect(guessOnboardingCategory("JEWELLERY")).toBe("JEWELLERY");
    expect(guessOnboardingCategory("MC")).toBe("MC");
    expect(guessOnboardingCategory("PLANNER")).toBe("PLANNER");
  });

  it("guesses BRIDAL_WEAR for ATTIRE — editable to GROOMS_WEAR via the dropdown, same ambiguous-but-guessable pattern as PHOTOGRAPHY→PHOTOGRAPHER", () => {
    expect(guessOnboardingCategory("ATTIRE")).toBe("BRIDAL_WEAR");
  });

  it("returns null for OTHER — the only remaining true 'no equivalent' case", () => {
    expect(guessOnboardingCategory("OTHER")).toBeNull();
  });

  it("covers every VendorCategory value (no accidental gaps)", () => {
    const allCategories: VendorCategory[] = [
      "VENUE", "CATERING", "PHOTOGRAPHY", "ATTIRE", "DECOR", "MUSIC", "MAKEUP", "TRANSPORT", "CAKE", "OTHER",
      "JEWELLERY", "MC", "PLANNER",
    ];
    for (const category of allCategories) {
      expect(() => guessOnboardingCategory(category)).not.toThrow();
    }
  });
});

describe("deriveCategoryBookingStatus", () => {
  it("returns NOT_STARTED for an empty category", () => {
    expect(deriveCategoryBookingStatus([])).toBe("NOT_STARTED");
  });

  it("returns NOT_STARTED when every interest is still NOT_CONTACTED", () => {
    expect(deriveCategoryBookingStatus(["NOT_CONTACTED", "NOT_CONTACTED"])).toBe("NOT_STARTED");
  });

  it("returns BOOKED if any interest is BOOKED, regardless of the others", () => {
    expect(deriveCategoryBookingStatus(["NOT_CONTACTED", "SHORTLISTED", "BOOKED"])).toBe("BOOKED");
  });

  it("returns RESEARCHING for any real progress short of BOOKED", () => {
    expect(deriveCategoryBookingStatus(["SHORTLISTED"])).toBe("RESEARCHING");
    expect(deriveCategoryBookingStatus(["NEGOTIATING"])).toBe("RESEARCHING");
  });

  it("folds an all-NOT_SELECTED category into RESEARCHING, not NOT_STARTED — 'everyone said no' is stuck, not idle", () => {
    expect(deriveCategoryBookingStatus(["NOT_SELECTED", "NOT_SELECTED"])).toBe("RESEARCHING");
  });
});

describe("pickMostAdvancedInterest", () => {
  function interest(id: string, bookingProgress: VendorBookingProgress, daysAgo: number) {
    return { id, bookingProgress, updatedAt: new Date(Date.now() - daysAgo * 86_400_000) };
  }

  it("returns null for an empty list", () => {
    expect(pickMostAdvancedInterest([])).toBeNull();
  });

  it("picks the highest-ranked interest among non-NOT_SELECTED entries", () => {
    const result = pickMostAdvancedInterest([
      interest("a", "SHORTLISTED", 5),
      interest("b", "NEGOTIATING", 3),
      interest("c", "ENQUIRY_SENT", 1),
    ]);
    expect(result?.id).toBe("b");
  });

  it("prefers BOOKED over anything else, even a more-recently-updated lower status", () => {
    const result = pickMostAdvancedInterest([
      interest("a", "NEGOTIATING", 0),
      interest("b", "BOOKED", 10),
    ]);
    expect(result?.id).toBe("b");
  });

  it("tie-breaks multiple BOOKED entries by most recent update (defends the no-DB-constraint race case)", () => {
    const result = pickMostAdvancedInterest([
      interest("old", "BOOKED", 10),
      interest("new", "BOOKED", 1),
    ]);
    expect(result?.id).toBe("new");
  });

  it("falls back to the most recent NOT_SELECTED entry when that's all there is — stays visible, not silently empty", () => {
    const result = pickMostAdvancedInterest([
      interest("old", "NOT_SELECTED", 10),
      interest("new", "NOT_SELECTED", 1),
    ]);
    expect(result?.id).toBe("new");
  });
});

describe("PROGRESS_RANK / VENDOR_PROGRESS_FORWARD_ORDER", () => {
  it("ranks every forward-order status strictly increasing", () => {
    const ranks = VENDOR_PROGRESS_FORWARD_ORDER.map((s) => PROGRESS_RANK[s]);
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeGreaterThan(ranks[i - 1]);
    }
  });

  it("never includes NOT_SELECTED in the forward order", () => {
    expect(VENDOR_PROGRESS_FORWARD_ORDER).not.toContain("NOT_SELECTED");
  });
});
