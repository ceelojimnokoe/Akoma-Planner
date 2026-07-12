// src/lib/csv.ts
//
// A small hand-rolled CSV parser instead of a new dependency — this
// project already deliberately rejected the "xlsx" package for guest
// import over unpatched security advisories (see LEARNING.md and
// guest-import.ts), and a comma/quote-aware CSV parser is simple enough
// to not need a package of its own. Handles the two real-world CSV
// dialects this app needs to accept: plain Excel "Save As CSV" exports
// and Google Sheets' "Download as CSV", both of which quote fields
// containing commas/quotes/newlines per RFC 4180.

/** Parses CSV text into rows of string cells, mirroring the `unknown[][]`
 *  shape read-excel-file already produces for .xlsx — so both feed the
 *  same downstream column-mapping logic in guest-import.ts unchanged. */
export function parseCsv(text: string): string[][] {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  function endField() {
    row.push(field);
    field = "";
  }
  function endRow() {
    endField();
    rows.push(row);
    row = [];
  }

  for (let i = 0; i < withoutBom.length; i++) {
    const c = withoutBom[i];

    if (inQuotes) {
      if (c === '"') {
        if (withoutBom[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      endField();
    } else if (c === "\r") {
      // Swallowed; the paired "\n" (or its absence, for a lone CR) drives the row break.
    } else if (c === "\n") {
      endRow();
    } else {
      field += c;
    }
  }

  // Final field/row, unless the file ended cleanly on a newline (which
  // already flushed everything via endRow()).
  if (field !== "" || row.length > 0) endRow();

  return rows;
}
