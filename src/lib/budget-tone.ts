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
