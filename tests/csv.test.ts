// tests/csv.test.ts
//
// Guards the hand-rolled CSV parser (chosen over a new dependency — see
// lib/csv.ts's header comment) against the real-world dialects it needs
// to handle: quoted fields with embedded commas/quotes/newlines, and a
// leading UTF-8 BOM (common in both Excel and Google Sheets CSV exports).

import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses a simple comma-delimited file", () => {
    const rows = parseCsv("Name,Side,RSVP\nKofi Mensah,Groom,Yes\nAma Owusu,Bride,Pending\n");
    expect(rows).toEqual([
      ["Name", "Side", "RSVP"],
      ["Kofi Mensah", "Groom", "Yes"],
      ["Ama Owusu", "Bride", "Pending"],
    ]);
  });

  it("handles quoted fields containing commas", () => {
    const rows = parseCsv('Name,Notes\n"Mensah, Kofi","Plus one, vegetarian"\n');
    expect(rows).toEqual([
      ["Name", "Notes"],
      ["Mensah, Kofi", "Plus one, vegetarian"],
    ]);
  });

  it("handles escaped double quotes inside a quoted field", () => {
    const rows = parseCsv('Name\n"Kofi ""KK"" Mensah"\n');
    expect(rows).toEqual([["Name"], ['Kofi "KK" Mensah']]);
  });

  it("handles embedded newlines inside a quoted field", () => {
    const rows = parseCsv('Name,Address\nKofi,"123 Main St\nAccra"\n');
    expect(rows).toEqual([
      ["Name", "Address"],
      ["Kofi", "123 Main St\nAccra"],
    ]);
  });

  it("strips a leading UTF-8 BOM", () => {
    const rows = parseCsv("﻿Name,Side\nKofi,Groom\n");
    expect(rows[0]).toEqual(["Name", "Side"]);
  });

  it("handles CRLF line endings", () => {
    const rows = parseCsv("Name,Side\r\nKofi,Groom\r\nAma,Bride\r\n");
    expect(rows).toEqual([
      ["Name", "Side"],
      ["Kofi", "Groom"],
      ["Ama", "Bride"],
    ]);
  });

  it("handles a file with no trailing newline", () => {
    const rows = parseCsv("Name,Side\nKofi,Groom");
    expect(rows).toEqual([
      ["Name", "Side"],
      ["Kofi", "Groom"],
    ]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseCsv("")).toEqual([]);
  });
});
