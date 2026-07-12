// src/lib/bisaai-context.ts
//
// The shared grounding layer for BisaAI's Q&A and proactive-suggestions
// logic (lib/bisaai-qa.ts) — the one place that turns a weddingPlanId
// into a full snapshot of "everything worth knowing about this wedding
// right now." Reuses the same pure calculators the dashboard already
// relies on (calculateBudgetSummary, calculateGuestStats) instead of
// re-deriving those numbers, and fetches the same five queries
// dashboard/page.tsx already makes. Deliberately NOT refactored into a
// shared fetch helper dashboard/page.tsx also calls, to keep this change
// scoped to BisaAI — only the math is shared, the fetch is duplicated
// on purpose.

import { prisma } from "./prisma";
import { calculateBudgetSummary, type BudgetSummary } from "./budget";
import { calculateGuestStats, type GuestStats } from "./guests";
import { daysUntil } from "./dates";
import type { BookingStatus, OnboardingVendorCategory } from "@prisma/client";

export interface WeddingContext {
  weddingDate: Date;
  daysUntil: number;
  guestEstimate: number;
  budget: BudgetSummary;
  guests: GuestStats;
  checklist: {
    percent: number;
    doneCount: number;
    totalCount: number;
    overdueCount: number;
    upcomingCount: number;
  };
  vendors: {
    bookedCount: number;
    totalCount: number;
    byCategory: Partial<Record<OnboardingVendorCategory, BookingStatus>>;
  };
  style: {
    theme: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    venueName: string | null;
    tradition: string;
  };
}

export async function getWeddingContext(weddingPlanId: string): Promise<WeddingContext> {
  const [weddingPlan, budgetCategories, checklistItems, guests, vendorBookingStatuses, coupleProfile] =
    await Promise.all([
      prisma.weddingPlan.findUniqueOrThrow({ where: { id: weddingPlanId } }),
      prisma.budgetCategory.findMany({ where: { weddingPlanId } }),
      prisma.checklistItem.findMany({ where: { weddingPlanId } }),
      prisma.guest.findMany({ where: { weddingPlanId } }),
      prisma.vendorBookingStatus.findMany({ where: { weddingPlanId } }),
      prisma.coupleProfile.findUnique({ where: { weddingPlanId } }),
    ]);

  const now = new Date();
  const doneCount = checklistItems.filter((i) => i.done).length;
  const overdueCount = checklistItems.filter((i) => !i.done && i.dueDate && i.dueDate < now).length;
  const upcomingCount = checklistItems.filter((i) => !i.done && i.dueDate && i.dueDate >= now).length;

  const byCategory: Partial<Record<OnboardingVendorCategory, BookingStatus>> = {};
  for (const v of vendorBookingStatuses) byCategory[v.category] = v.status;

  return {
    weddingDate: weddingPlan.weddingDate,
    daysUntil: daysUntil(weddingPlan.weddingDate),
    guestEstimate: weddingPlan.guestEstimate,
    budget: calculateBudgetSummary(weddingPlan.totalBudgetGHS, budgetCategories),
    guests: calculateGuestStats(guests),
    checklist: {
      percent: checklistItems.length ? Math.round((doneCount / checklistItems.length) * 100) : 0,
      doneCount,
      totalCount: checklistItems.length,
      overdueCount,
      upcomingCount,
    },
    vendors: {
      bookedCount: vendorBookingStatuses.filter((v) => v.status === "BOOKED").length,
      totalCount: vendorBookingStatuses.length,
      byCategory,
    },
    style: {
      theme: coupleProfile?.theme ?? null,
      primaryColor: coupleProfile?.primaryColor ?? null,
      secondaryColor: coupleProfile?.secondaryColor ?? null,
      venueName: coupleProfile?.venueName ?? null,
      tradition: weddingPlan.tradition,
    },
  };
}
