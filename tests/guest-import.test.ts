// tests/guest-import.test.ts
//
// Guards the real bug this checkpoint fixed: a guest list with no
// recognizable "Side" column used to invalidate every single row. Also
// covers the spec's explicit column-alias examples and manual mapping.

import { describe, expect, it } from "vitest";
import {
  detectColumnMapping,
  detectFileKind,
  isMappingComplete,
  normalizeHeader,
  parseRows,
} from "@/lib/guest-import";

describe("normalizeHeader", () => {
  it.each([
    ["Guest Name", "name"],
    ["Name", "name"],
    ["Bride/Groom Side", "side"],
    ["Response", "rsvpStatus"],
    ["Phone", "contact"],
    ["Telephone", "contact"],
    ["Mobile", "contact"],
    ["Email", "contact"],
  ] as const)("maps %s -> %s", (header, field) => {
    expect(normalizeHeader(header)).toBe(field);
  });

  it("returns null for an unrecognized header", () => {
    expect(normalizeHeader("Dietary Requirements")).toBeNull();
  });
});

describe("parseRows — the Side bug", () => {
  it("imports every row even when no Side column exists at all", () => {
    const headerRow = ["Name", "Email"];
    const mapping = detectColumnMapping(headerRow);
    const rows = parseRows(
      [
        ["Kofi Mensah", "kofi@example.com"],
        ["Ama Owusu", "ama@example.com"],
      ],
      mapping
    );
    expect(rows.every((r) => r.valid)).toBe(true);
    expect(rows.every((r) => r.side === "BOTH")).toBe(true);
  });

  it("defaults to BOTH when a Side column exists but has an unrecognized value", () => {
    const mapping = detectColumnMapping(["Name", "Side"]);
    const rows = parseRows([["Kofi", "N/A"]], mapping);
    expect(rows[0].valid).toBe(true);
    expect(rows[0].side).toBe("BOTH");
  });

  it("still only invalidates rows missing a name", () => {
    const mapping = detectColumnMapping(["Name", "Side"]);
    const rows = parseRows([["", "Bride"]], mapping);
    expect(rows[0].valid).toBe(false);
    expect(rows[0].reason).toBe("Missing name");
  });

  it("skips fully blank rows entirely", () => {
    const mapping = detectColumnMapping(["Name", "Side"]);
    const rows = parseRows([["", ""], ["Kofi", "Groom"]], mapping);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Kofi");
  });
});

describe("manual column mapping", () => {
  it("isMappingComplete is false until Guest is mapped", () => {
    expect(isMappingComplete({})).toBe(false);
    expect(isMappingComplete({ side: 1 })).toBe(false);
    expect(isMappingComplete({ name: 0 })).toBe(true);
  });

  it("parseRows respects an explicit manual mapping override", () => {
    // A sheet with an ambiguous header the auto-detector can't place —
    // the user manually points "Full guest name" -> name.
    const mapping = { name: 0, contact: 1 };
    const rows = parseRows([["Kofi Mensah", "0244000000"]], mapping);
    expect(rows[0]).toMatchObject({ name: "Kofi Mensah", contact: "0244000000", valid: true });
  });
});

describe("detectFileKind", () => {
  it.each([
    ["guests.xlsx", "xlsx"],
    ["guests.CSV", "csv"],
    ["guests.xls", "unsupported-xls"],
    ["guests.pdf", "unsupported"],
    ["guests", "unsupported"],
  ] as const)("%s -> %s", (filename, kind) => {
    expect(detectFileKind(filename)).toBe(kind);
  });
});
