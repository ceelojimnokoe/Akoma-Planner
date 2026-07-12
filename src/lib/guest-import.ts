// src/lib/guest-import.ts
//
// Pure column-mapping/row-parsing logic for the guest-list importer,
// pulled out of ImportGuestsModal.tsx so it's unit-testable without a
// browser file input (see tests/guest-import.test.ts) and shared between
// the xlsx and csv parsing paths — both read-excel-file and lib/csv.ts
// produce the same `unknown[][]`/`string[][]` row shape, so everything
// below this point doesn't care which format the file came in as.
//
// The one real bug this file fixes: "Side" (Bride/Groom/Both) is an
// AkomaPlanner-specific concept most real guest lists don't have a
// column for at all. The old logic treated a missing/unrecognized side
// as an invalid row, which meant an totally ordinary Name/Email/Phone
// export imported zero rows. Side now defaults to "BOTH" whenever it
// can't be determined — only a missing guest name still invalidates a
// row, since that's the one field with no sane default.

export type Field = "name" | "side" | "rsvpStatus" | "contact";

export const FIELD_ORDER: Field[] = ["name", "side", "rsvpStatus", "contact"];

export const FIELD_LABELS: Record<Field, string> = {
  name: "Guest",
  side: "Side",
  rsvpStatus: "RSVP",
  contact: "Contact",
};

const NAME_ALIASES = ["name", "guest", "guest name", "full name"];
const SIDE_ALIASES = ["side", "bride/groom", "bride/groom side", "group"];
const RSVP_ALIASES = ["rsvp", "rsvp status", "status", "attending", "response"];
const CONTACT_ALIASES = ["contact", "phone", "phone number", "telephone", "mobile", "email", "contact info"];

export function normalizeHeader(header: string): Field | null {
  const h = header.trim().toLowerCase();
  if (NAME_ALIASES.includes(h)) return "name";
  if (SIDE_ALIASES.includes(h)) return "side";
  if (RSVP_ALIASES.includes(h)) return "rsvpStatus";
  if (CONTACT_ALIASES.includes(h)) return "contact";
  return null;
}

/** Returns null (not a default) when unrecognized — callers decide the
 *  fallback, since a manual-mapping UI needs to distinguish "this column
 *  has a garbage value" from "just use BOTH" for its own messaging. */
export function normalizeSide(value: string): "BRIDE" | "GROOM" | "BOTH" | null {
  const v = value.trim().toLowerCase();
  if (v === "bride" || v === "b") return "BRIDE";
  if (v === "groom" || v === "g") return "GROOM";
  if (v === "both") return "BOTH";
  return null;
}

export function normalizeRsvp(value: string): "PENDING" | "YES" | "NO" {
  const v = value.trim().toLowerCase();
  if (["yes", "confirmed", "attending", "accepted"].includes(v)) return "YES";
  if (["no", "declined", "not attending", "rejected"].includes(v)) return "NO";
  return "PENDING";
}

/** Column index (into a header row) per target field, e.g. `{ name: 0, contact: 2 }`. */
export type ColumnMapping = Partial<Record<Field, number>>;

export function detectColumnMapping(headerRow: unknown[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  headerRow.forEach((cell, i) => {
    const field = normalizeHeader(String(cell ?? ""));
    if (field && mapping[field] === undefined) mapping[field] = i;
  });
  return mapping;
}

/** "Guest" is the only field with no sane default — everything else can
 *  fall back (side → BOTH, rsvp → PENDING, contact → blank), so this is
 *  the one thing that blocks continuing past the mapping step. */
export function isMappingComplete(mapping: ColumnMapping): boolean {
  return mapping.name !== undefined;
}

export interface PreviewRow {
  name: string;
  side: "BRIDE" | "GROOM" | "BOTH";
  rsvpStatus: "PENDING" | "YES" | "NO";
  contact?: string;
  valid: boolean;
  reason?: string;
}

function cellValue(row: unknown[], mapping: ColumnMapping, field: Field): string {
  const index = mapping[field];
  if (index === undefined || row[index] == null) return "";
  return String(row[index]);
}

export function parseRows(dataRows: unknown[][], mapping: ColumnMapping): PreviewRow[] {
  return dataRows
    .filter((row) => row.some((cell) => cell != null && String(cell).trim() !== ""))
    .map((row) => {
      const name = cellValue(row, mapping, "name").trim();
      if (!name) {
        return { name: "", side: "BOTH", rsvpStatus: "PENDING", contact: "", valid: false, reason: "Missing name" };
      }
      const side = normalizeSide(cellValue(row, mapping, "side")) ?? "BOTH";
      const rsvpStatus = normalizeRsvp(cellValue(row, mapping, "rsvpStatus"));
      const contact = cellValue(row, mapping, "contact").trim();
      return { name, side, rsvpStatus, contact, valid: true };
    });
}

export type FileKind = "xlsx" | "csv" | "unsupported-xls" | "unsupported";

export function detectFileKind(filename: string): FileKind {
  const lower = filename.trim().toLowerCase();
  if (lower.endsWith(".xlsx")) return "xlsx";
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".xls")) return "unsupported-xls";
  return "unsupported";
}
