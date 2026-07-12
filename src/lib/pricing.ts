// src/lib/pricing.ts
//
// Single source of truth for the Wedding Pass price — the pricing page,
// checkout, and Settings all import from here, so the price never has to
// be updated in more than one place. GHS only, per the project's currency
// rule (see lib/currency.ts).
//
// One-time payment only — no monthly/yearly billing, no plans/intervals.
// See LEARNING.md for why the subscription model was replaced.

export const WEDDING_PASS_AMOUNT_GHS = 300;
