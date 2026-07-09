// src/lib/currency.ts
//
// Every price in AkomaPlanner is denominated in Ghanaian Cedis (GHS).
// USD_TO_GHS exists only as a single, obvious place to update the
// conversion rate if we ever need to display a USD-equivalent figure
// (e.g. for a diaspora user) — nothing in the MVP actually uses it yet,
// but scattering conversion rates across files is how bugs happen later.

export const USD_TO_GHS = 12.5;

// Intl.NumberFormat handles thousands separators and decimal places
// correctly (and locale-appropriately) so we never hand-roll string math
// on money — that's a common source of off-by-one-decimal bugs.
const ghsFormatter = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats a number as "GH₵ 1,234.50". */
export function formatGHS(amount: number): string {
  return ghsFormatter.format(amount);
}

/** Converts a USD amount to GHS using the fixed MVP rate. */
export function usdToGHS(usd: number): number {
  return usd * USD_TO_GHS;
}
