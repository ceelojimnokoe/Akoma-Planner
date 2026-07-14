// tests/fuzzy-match.test.ts
//
// findBestMatch is BisaAI's real scored matcher for open-ended chat text
// against real domain records (lib/fuzzy-match.ts). These cases are the
// exact ones the architecture stress-test found using real seed data
// (prisma/seed.ts) before this file existed — a naive .includes() match
// (the only prior precedent, lib/budget-fit.ts) fails or collides on
// both of them.

import { describe, expect, it } from "vitest";
import { findBestMatch } from "@/lib/fuzzy-match";

describe("findBestMatch", () => {
  it("resolves 'traditional gifts' to the real category 'Gifts for the Family' via shared-word scoring", () => {
    const categories = [
      { id: "1", label: "Drinks" },
      { id: "2", label: "Kente & Cloth" },
      { id: "3", label: "Gifts for the Family" },
      { id: "4", label: "Money (Customary)" },
      { id: "5", label: "Jewelry" },
    ];
    const { match } = findBestMatch("traditional gifts", categories);
    expect(match?.label).toBe("Gifts for the Family");
  });

  it("leaves 'Elegant Events' ambiguous across real seeded vendor names sharing 'Elegant' or 'Events'", () => {
    const vendors = [
      { id: "1", label: "Elegant Touch Decor" },
      { id: "2", label: "Akwaaba Events Decor" },
      { id: "3", label: "Golden Palm Decor" },
      { id: "4", label: "Ohemaa Events & Decor" },
      { id: "5", label: "MC Prince Events" },
      { id: "6", label: "MC Ohemaa Events" },
      { id: "7", label: "Grace Events Coordination" },
    ];
    const { match, topMatches } = findBestMatch("Elegant Events", vendors);
    expect(match).toBeNull();
    expect(topMatches.length).toBeGreaterThan(1);
  });

  it("resolves an exact (case-insensitive) match outright", () => {
    const guests = [{ id: "1", label: "Ama Owusu" }, { id: "2", label: "Kwame Boateng" }];
    const { match } = findBestMatch("ama owusu", guests);
    expect(match?.id).toBe("1");
  });

  it("resolves a clear substring match", () => {
    const categories = [{ id: "1", label: "Venue" }, { id: "2", label: "Catering" }];
    const { match } = findBestMatch("Catering", categories);
    expect(match?.id).toBe("2");
  });

  it("returns null with no candidates when nothing scores above zero", () => {
    const categories = [{ id: "1", label: "Venue" }, { id: "2", label: "Catering" }];
    const { match, topMatches } = findBestMatch("xyzzy", categories);
    expect(match).toBeNull();
    expect(topMatches).toEqual([]);
  });

  it("is case-insensitive and word-order tolerant for a clear single winner", () => {
    const vendors = [{ id: "1", label: "Bisa's Kitchen Catering" }, { id: "2", label: "Golden Palm Decor" }];
    const { match } = findBestMatch("bisa's kitchen", vendors);
    expect(match?.id).toBe("1");
  });
});
