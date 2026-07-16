// src/components/guests/ImportGuestsModal.tsx
//
// Parses the spreadsheet entirely in the browser — .xlsx via
// read-excel-file/browser (see LEARNING.md for why this replaced the more
// common "xlsx" package, which has an unpatched security advisory), .csv
// via the hand-rolled parser in lib/csv.ts (same reasoning: no new
// dependency for something this small). Both feed the same
// `unknown[][]` shape into lib/guest-import.ts's column-mapping/row-
// parsing logic, so everything past the initial read is format-agnostic.
//
// Column mapping is always visible (not just on failure) so a confident
// auto-detection can still be corrected by hand, but only *forces* itself
// open and blocks the Import button when the one truly required field —
// Guest — couldn't be found. Only the confirmed, valid rows are sent to
// importGuests() — the actual write.

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importGuests, type ImportGuestsResult } from "@/server/actions/guests";
import {
  detectColumnMapping,
  detectFileKind,
  FIELD_LABELS,
  FIELD_ORDER,
  isMappingComplete,
  parseRows,
  type ColumnMapping,
  type Field,
} from "@/lib/guest-import";
import { parseCsv } from "@/lib/csv";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function ImportGuestsModal({ weddingPlanId }: { weddingPlanId: string }) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheetRows, setSheetRows] = useState<unknown[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [mappingExpanded, setMappingExpanded] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportGuestsResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const headerRow = sheetRows[0] ?? [];
  const dataRows = sheetRows.slice(1);
  const mappingComplete = isMappingComplete(mapping);

  const rows = useMemo(() => parseRows(dataRows, mapping), [dataRows, mapping]);
  const validCount = rows.filter((r) => r.valid).length;
  const skippedRows = rows.filter((r) => !r.valid);

  function reset() {
    setFileName(null);
    setSheetRows([]);
    setMapping({});
    setMappingExpanded(false);
    setFileError(null);
    setResult(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after fixing it
    if (!file) return;
    reset();
    setFileName(file.name);

    const kind = detectFileKind(file.name);
    if (kind === "unsupported-xls") {
      setFileError(
        "We don't support the older Excel 97-2003 (.xls) format yet. Please re-save this file as .xlsx or .csv and upload again — in Excel: File → Save As → Excel Workbook (.xlsx); in Google Sheets: File → Download → Comma Separated Values (.csv)."
      );
      return;
    }
    if (kind === "unsupported") {
      setFileError("Unsupported file type. Please upload a .xlsx or .csv file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("That file is larger than we can import here (5MB max). Try splitting it into smaller batches.");
      return;
    }

    try {
      // Dynamically imported: read-excel-file's xlsx parser is the single
      // biggest chunk of this modal's weight, and most visits to /guests
      // never open this modal at all, let alone pick an .xlsx file over
      // .csv — no reason to ship it in the page's initial bundle.
      const data =
        kind === "xlsx" ? await (await import("read-excel-file/browser")).readSheet(file) : parseCsv(await file.text());
      if (data.length === 0) {
        setFileError("This file doesn't contain any data rows.");
        return;
      }
      const detected = detectColumnMapping(data[0] as unknown[]);
      setSheetRows(data as unknown[][]);
      setMapping(detected);
      setMappingExpanded(!isMappingComplete(detected));
    } catch (err) {
      console.error("Guest import: failed to parse file", err);
      setFileError("Couldn't read that file — make sure it isn't corrupted and try again.");
    }
  }

  function updateMapping(field: Field, columnIndex: number | null) {
    setMapping((prev) => {
      const next = { ...prev };
      if (columnIndex === null) delete next[field];
      else next[field] = columnIndex;
      return next;
    });
  }

  function handleImport() {
    const validRows = rows.filter((r) => r.valid);
    startTransition(async () => {
      const response = await importGuests(weddingPlanId, validRows);
      setResult(response);
      if (response.ok) router.refresh();
    });
  }

  function columnLabel(index: number): string {
    const raw = headerRow[index];
    const text = raw != null ? String(raw).trim() : "";
    return text || `Column ${index + 1}`;
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Import guests
      </Button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Import guests"
      >
        <div className="space-y-4">
          {!result?.ok && (
            <div>
              <p className="text-sm text-akoma-ink/60">
                Upload a .xlsx spreadsheet or a .csv file (including a Google Sheets CSV export). Columns named{" "}
                <code>Guest</code>/<code>Name</code>, <code>Side</code>, <code>RSVP</code>, and{" "}
                <code>Phone</code>/<code>Email</code>/<code>Contact</code> are matched automatically, in any order.
              </p>
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFile}
                className="mt-3 block w-full text-sm text-akoma-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-akoma-green file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
              />
              {fileName && !fileError && <p className="mt-2 text-xs text-akoma-ink/50">Selected: {fileName}</p>}
              {fileError && <p className="mt-2 text-sm text-akoma-terracotta">{fileError}</p>}
            </div>
          )}

          {sheetRows.length > 0 && !result?.ok && (
            <div className="space-y-3">
              <div className="rounded-lg border border-akoma-ink/10 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-akoma-ink">Column mapping</p>
                  <button
                    type="button"
                    onClick={() => setMappingExpanded((v) => !v)}
                    className="text-xs font-medium text-akoma-green hover:underline"
                  >
                    {mappingExpanded ? "Hide" : "Adjust"}
                  </button>
                </div>
                {!mappingComplete && (
                  <p className="mt-1 text-sm text-akoma-terracotta">
                    We couldn&apos;t find a Guest name column — map it below to continue.
                  </p>
                )}
                {!mappingExpanded ? (
                  <p className="mt-1 text-xs text-akoma-ink/60">
                    {FIELD_ORDER.map((field) => {
                      const idx = mapping[field];
                      return `${FIELD_LABELS[field]} ← ${idx != null ? columnLabel(idx) : field === "side" ? "not found, defaults to Both" : "not found"}`;
                    }).join(" · ")}
                  </p>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {FIELD_ORDER.map((field) => (
                      <label key={field} className="text-xs text-akoma-ink/70">
                        {FIELD_LABELS[field]}
                        {field === "name" && <span className="text-akoma-terracotta"> *</span>}
                        <select
                          value={mapping[field] ?? ""}
                          onChange={(e) => updateMapping(field, e.target.value === "" ? null : Number(e.target.value))}
                          className="mt-1 block w-full rounded-lg border border-akoma-ink/15 px-2 py-1.5 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
                        >
                          <option value="">— None —</option>
                          {headerRow.map((_, i) => (
                            <option key={i} value={i}>
                              {columnLabel(i)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-sm text-akoma-ink/70">
                <span className="font-medium text-akoma-ink">{validCount} guest{validCount === 1 ? "" : "s"} detected.</span>
                {skippedRows.length > 0 && ` ${skippedRows.length} row${skippedRows.length === 1 ? "" : "s"} skipped (missing name).`}
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
                          {r.valid ? <Badge tone="green">Ready</Badge> : <Badge tone="terracotta">{r.reason}</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result?.error && (
                <p className="rounded-lg bg-akoma-terracotta/10 px-3 py-2 text-sm text-akoma-terracotta">{result.error}</p>
              )}

              <Button
                type="button"
                onClick={handleImport}
                disabled={isPending || validCount === 0 || !mappingComplete}
                className="w-full"
              >
                {isPending ? "Importing…" : `Import ${validCount} guest${validCount === 1 ? "" : "s"}`}
              </Button>
            </div>
          )}

          {result?.ok && (
            <div className="flex flex-col items-center rounded-lg bg-akoma-green/10 px-4 py-8 text-center">
              <p className="text-3xl">✅</p>
              <p className="mt-3 font-semibold text-akoma-ink">
                Successfully imported {result.imported} guest{result.imported === 1 ? "" : "s"}!
              </p>
              {result.skipped > 0 && (
                <p className="mt-1 text-sm text-akoma-ink/60">
                  {result.skipped} row{result.skipped === 1 ? "" : "s"} skipped (likely over your plan&apos;s guest cap).
                </p>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
