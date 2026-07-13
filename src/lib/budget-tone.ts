// src/lib/budget-tone.ts
//
// Single source of truth for the three-tier budget status color, reused
// by ProgressRing, BudgetProgressBar, and the dashboard's Budget-spent
// stat card — so all three always agree on what "getting close" looks
// like. Reuses the existing brand palette rather than inventing a new
// color: akoma-gold already reads as "amber/caution" everywhere else in
// the app (the RSVP pie chart's "Pending" segment, priority badges), so
// it's the natural middle tier here too — no new color token needed.

export type BudgetTone = "green" | "gold" | "terracotta";

export function getBudgetTone(percentSpent: number): BudgetTone {
  if (percentSpent > 80) return "terracotta";
  if (percentSpent > 60) return "gold";
  return "green";
}

/** Color for the "Remaining" figure specifically — a different question
 *  from getBudgetTone above (that's "how close to the limit," this is
 *  "is there a real number here yet, and is it still positive"). Grey
 *  before any money's been spent (nothing to react to yet), green once
 *  spending has started and there's still room, red once over budget. */
export type RemainingTone = "neutral" | "green" | "terracotta";

export function getRemainingTone(spentGHS: number, remainingGHS: number): RemainingTone {
  if (spentGHS === 0) return "neutral";
  if (remainingGHS < 0) return "terracotta";
  return "green";
}
