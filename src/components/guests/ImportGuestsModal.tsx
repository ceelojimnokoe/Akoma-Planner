// src/components/guests/ImportGuestsModal.tsx
//
// Parses the spreadsheet entirely in the browser (read-excel-file/browser
// — see LEARNING.md for why this replaced the more common "xlsx" package,
// which has an unpatched security advisory), maps common column-name
// variations onto the four fields this app tracks, and shows an editable
// preview before anything touches the database. Only the confirmed rows
// are sent to importGuests() — the actual write.

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readSheet } from "read-excel-file/browser";
import { importGuests, type ImportedGuestRow, type ImportGuestsResult } from "@/server/actions/guests";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const NAME_ALIASES = ["name", "guest", "guest name", "full name"];
const SIDE_ALIASES = ["side", "bride/groom", "group"];
const RSVP_ALIASES = ["rsvp", "rsvp status", "status", "attending"];
const CONTACT_ALIASES = ["contact", "phone", "phone number", "email", "contact info"];

type Field = "name" | "side" | "rsvpStatus" | "contact";

function normalizeHeader(header: string): Field | null {
  const h = header.trim().toLowerCase();
  if (NAME_ALIASES.includes(h)) return "name";
  if (SIDE_ALIASES.includes(h)) return "side";
  if (RSVP_ALIASES.includes(h)) return "rsvpStatus";
  if (CONTACT_ALIASES.includes(h)) return "contact";
  return null;
}

function normalizeSide(value: string): "BRIDE" | "GROOM" | "BOTH" | null {
  const v = value.trim().toLowerCase();
  if (v === "bride" || v === "b") return "BRIDE";
  if (v === "groom" || v === "g") return "GROOM";
  if (v === "both") return "BOTH";
  return null;
}

function normalizeRsvp(value: string): "PENDING" | "YES" | "NO" {
  const v = value.trim().toLowerCase();
  if (["yes", "confirmed", "attending", "accepted"].includes(v)) return "YES";
  if (["no", "declined", "not attending", "rejected"].includes(v)) return "NO";
  return "PENDING";
}

interface PreviewRow extends ImportedGuestRow {
  valid: boolean;
  reason?: string;
}

function parseRows(sheetRows: unknown[][]): PreviewRow[] {
  const [headerRow, ...dataRows] = sheetRows;
  if (!headerRow) return [];
  const fieldByColumn = headerRow.map((h) => normalizeHeader(String(h ?? "")));

  return dataRows
    .filter((row) => row.some((cell) => cell != null && String(cell).trim() !== ""))
    .map((row) => {
      const record: Partial<Record<Field, string>> = {};
      fieldByColumn.forEach((field, i) => {
        if (field) record[field] = row[i] != null ? String(row[i]) : "";
      });

      const name = record.name?.trim() ?? "";
      if (!name) {
        return { name: "", side: "BRIDE", rsvpStatus: "PENDING", contact: "", valid: false, reason: "Missing name" };
      }
      const side = normalizeSide(record.side ?? "");
      if (!side) {
        return { name, side: "BRIDE", rsvpStatus: "PENDING", contact: record.contact, valid: false, reason: "Unrecognized side" };
      }
      return { name, side, rsvpStatus: normalizeRsvp(record.rsvpStatus ?? ""), contact: record.contact, valid: true };
    });
}

export function ImportGuestsModal({ weddingPlanId }: { weddingPlanId: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportGuestsResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function reset() {
    setRows([]);
    setParseError(null);
    setResult(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    reset();
    try {
      const data = await readSheet(file);
      setRows(parseRows(data as unknown[][]));
    } catch {
      setParseError("Couldn't read that file — make sure it's a valid .xlsx spreadsheet.");
    }
  }

  function handleImport() {
    const validRows = rows.filter((r) => r.valid);
    startTransition(async () => {
      const response = await importGuests(weddingPlanId, validRows);
      setResult(response);
      if (response.ok) router.refresh();
    });
  }

  const validCount = rows.filter((r) => r.valid).length;

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Import from Excel
      </Button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Import guests from Excel"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-akoma-ink/60">
              Upload a .xlsx file. Columns named <code>Guest</code>/<code>Name</code>, <code>Side</code>,{" "}
              <code>RSVP</code>, and <code>Phone</code>/<code>Email</code>/<code>Contact</code> are matched
              automatically, in any order.
            </p>
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFile}
              className="mt-3 block w-full text-sm text-akoma-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-akoma-green file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
            />
            {parseError && <p className="mt-2 text-sm text-akoma-terracotta">{parseError}</p>}
          </div>

          {rows.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-akoma-ink/70">
                {validCount} of {rows.length} rows look good and will be imported.
              </p>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-akoma-ink/10">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-akoma-cream">
                    <tr className="text-xs uppercase tracking-wide text-akoma-ink/40">
                      <th className="px-3 py-2 font-medium">Guest</th>
                      <th className="px-3 py-2 font-medium">Side</th>
                      <th className="px-3 py-2 font-medium">RSVP</th>
                      <th className="px-3 py-2 font-medium">Contact</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-akoma-ink/5">
                    {rows.map((r, i) => (
                      <tr key={i} className={r.valid ? undefined : "opacity-50"}>
                        <td className="px-3 py-1.5">{r.name || "—"}</td>
                        <td className="px-3 py-1.5">{r.side}</td>
                        <td className="px-3 py-1.5">{r.rsvpStatus}</td>
                        <td className="px-3 py-1.5">{r.contact || "—"}</td>
                        <td className="px-3 py-1.5">
                          {r.valid ? (
                            <Badge tone="green">Ready</Badge>
                          ) : (
                            <Badge tone="terracotta">{r.reason}</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result?.ok && (
                <p className="rounded-lg bg-akoma-green/10 px-3 py-2 text-sm text-akoma-green">
                  Imported {result.imported} guest{result.imported === 1 ? "" : "s"}.
                  {result.skipped > 0 && ` ${result.skipped} skipped (likely over your plan's guest cap).`}
                </p>
              )}
              {result?.error && (
                <p className="rounded-lg bg-akoma-terracotta/10 px-3 py-2 text-sm text-akoma-terracotta">{result.error}</p>
              )}

              <Button type="button" onClick={handleImport} disabled={isPending || validCount === 0} className="w-full">
                {isPending ? "Importing…" : `Import ${validCount} guest${validCount === 1 ? "" : "s"}`}
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
