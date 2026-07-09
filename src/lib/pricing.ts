// src/lib/pricing.ts
//
// Single source of truth for Pro pricing — both the pricing page and the
// checkout page import from here, so a price never has to be updated in
// two places. GHS only, per the project's currency rule (see
// lib/currency.ts).

export const PRICING = {
  monthly: { label: "Monthly", amountGHS: 62, suffix: "/month" },
  yearly: { label: "Yearly", amountGHS: 500, suffix: "/year" },
  pass: { label: "One-time Wedding Pass", amountGHS: 188, suffix: "one-time" },
} as const;

export type BillingInterval = keyof typeof PRICING;

export function isBillingInterval(value: string): value is BillingInterval {
  return value in PRICING;
}
