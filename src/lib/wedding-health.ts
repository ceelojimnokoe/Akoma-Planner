// src/lib/wedding-health.ts
//
// Pure "how's planning actually going" scoring — no Prisma import, same
// convention as lib/budget.ts/lib/guests.ts. Combines four signals the
// dashboard already fetches into one number, rather than making the
// couple mentally combine four separate stat cards themselves.
//
// Weights (documented here since they're the one genuinely subjective
// choice in this file): Timeline 30% — the single best "is this
// generally under control" signal, since it accounts for how much time
// is actually left, not just a raw percentage. Budget 20% — weighted
// lower because going over on one line item is common and usually
// recoverable, unlike falling behind on tasks or bookings. Vendors 25%
// and Guests 25% — the two concrete, checkable planning milestones,
// weighted equally.

import { getBudgetTone } from "./budget-tone";

export interface WeddingHealthInput {
  checklistPercent: number;
  weddingPlanCreatedAt: Date;
  weddingDate: Date;
  budgetPercentSpent: number;
  budgetRemainingGHS: number;
  vendorsBookedCount: number;
  vendorsTotalCount: number;
  guestsConfirmedAttendees: number;
  guestsTotalAttendees: number;
  /** Defaults to now — overridable so this stays deterministic in tests. */
  today?: Date;
}

export type WeddingHealthStatus = "on-track" | "needs-attention" | "at-risk";

export interface WeddingHealthSubScore {
  score: number;
  label: string;
}

export interface WeddingHealthResult {
  score: number;
  status: WeddingHealthStatus;
  statusLabel: string;
  timeline: WeddingHealthSubScore;
  budget: WeddingHealthSubScore;
  vendors: WeddingHealthSubScore;
  guests: WeddingHealthSubScore;
}

const WEIGHTS = { timeline: 0.3, budget: 0.2, vendors: 0.25, guests: 0.25 } as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function daysBetween(a: Date, b: Date): number {
  const oneDayMs = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / oneDayMs);
}

/** Pace-based, not arbitrary: compares actual checklist completion
 *  against how much of the planning window has already elapsed. Ahead
 *  of pace scores above the 75-point baseline (clamped at 100), behind
 *  pace scores below it (clamped at 0). */
function getTimelineScore(input: WeddingHealthInput): WeddingHealthSubScore {
  const totalDays = Math.max(1, daysBetween(input.weddingPlanCreatedAt, input.weddingDate));
  const elapsedDays = clamp(daysBetween(input.weddingPlanCreatedAt, input.today ?? new Date()), 0, totalDays);
  const expectedPercent = (elapsedDays / totalDays) * 100;
  const diff = input.checklistPercent - expectedPercent;

  const score = clamp(75 + diff, 0, 100);
  const label = diff >= 10 ? "Ahead of schedule" : diff <= -15 ? "Behind schedule" : "On pace";
  return { score, label };
}

/** Reuses getBudgetTone (lib/budget-tone.ts) rather than reimplementing
 *  its green/gold/terracotta thresholds, so this and the Budget page's
 *  own "getting close" signal never disagree. Genuinely exceeding the
 *  total budget is scored worse than merely being in the terracotta
 *  (>80% spent but still under the total) band. */
function getBudgetScore(input: WeddingHealthInput): WeddingHealthSubScore {
  if (input.budgetRemainingGHS < 0) return { score: 15, label: "Over budget" };

  const tone = getBudgetTone(input.budgetPercentSpent);
  if (tone === "green") return { score: 95, label: "Healthy" };
  if (tone === "gold") return { score: 75, label: "On track" };
  return { score: 50, label: "Watch spending" };
}

function getVendorScore(input: WeddingHealthInput): WeddingHealthSubScore {
  const percent = input.vendorsTotalCount > 0 ? (input.vendorsBookedCount / input.vendorsTotalCount) * 100 : 100;
  return { score: clamp(percent, 0, 100), label: `${input.vendorsBookedCount}/${input.vendorsTotalCount} booked` };
}

function getGuestScore(input: WeddingHealthInput): WeddingHealthSubScore {
  const percent = input.guestsTotalAttendees > 0 ? (input.guestsConfirmedAttendees / input.guestsTotalAttendees) * 100 : 100;
  return { score: clamp(percent, 0, 100), label: `${Math.round(percent)}% confirmed` };
}

export function getWeddingHealthScore(input: WeddingHealthInput): WeddingHealthResult {
  const timeline = getTimelineScore(input);
  const budget = getBudgetScore(input);
  const vendors = getVendorScore(input);
  const guests = getGuestScore(input);

  const score = Math.round(
    timeline.score * WEIGHTS.timeline + budget.score * WEIGHTS.budget + vendors.score * WEIGHTS.vendors + guests.score * WEIGHTS.guests
  );

  const status: WeddingHealthStatus = score >= 80 ? "on-track" : score >= 55 ? "needs-attention" : "at-risk";
  const statusLabel = status === "on-track" ? "🟢 On Track" : status === "needs-attention" ? "🟡 Needs Attention" : "🔴 At Risk";

  return { score, status, statusLabel, timeline, budget, vendors, guests };
}
