// tests/traditional-ceremony-defaults.test.ts
//
// resolveTraditionalCeremonyCatalogCity and buildDefaultTraditionalCeremonyItems
// are pure (no Prisma import) — the query itself lives in
// server/actions/wedding.ts's createWeddingPlan, same split as every
// other *-defaults.ts file in this project.

import { describe, expect, it } from "vitest";
import {
  buildDefaultTraditionalCeremonyItems,
  resolveTraditionalCeremonyCatalogCity,
} from "@/lib/traditional-ceremony-defaults";

describe("resolveTraditionalCeremonyCatalogCity", () => {
  it("passes ACCRA and KUMASI through unchanged", () => {
    expect(resolveTraditionalCeremonyCatalogCity("ACCRA")).toBe("ACCRA");
    expect(resolveTraditionalCeremonyCatalogCity("KUMASI")).toBe("KUMASI");
  });

  it("falls back OTHER to ACCRA — the catalog has zero OTHER rows, and a Pass-paying couple needs real defaults", () => {
    expect(resolveTraditionalCeremonyCatalogCity("OTHER")).toBe("ACCRA");
  });
});

describe("buildDefaultTraditionalCeremonyItems", () => {
  it("maps each catalog row to a zero-spent, not-done, default item", () => {
    const items = buildDefaultTraditionalCeremonyItems([
      { category: "Drinks", itemName: "Schnapps (bottle)", estLowGHS: 80, estHighGHS: 150 },
    ]);
    expect(items).toEqual([
      { name: "Schnapps (bottle)", category: "Drinks", allocatedGHS: 115, spentGHS: 0, done: false, isDefault: true },
    ]);
  });

  it("defaults allocatedGHS to the estimate range's midpoint, rounded", () => {
    const items = buildDefaultTraditionalCeremonyItems([
      { category: "Jewelry", itemName: "Engagement ring", estLowGHS: 2000, estHighGHS: 15001 },
    ]);
    expect(items[0].allocatedGHS).toBe(Math.round((2000 + 15001) / 2));
  });

  it("returns an empty list for an empty catalog, no crash", () => {
    expect(buildDefaultTraditionalCeremonyItems([])).toEqual([]);
  });
});
