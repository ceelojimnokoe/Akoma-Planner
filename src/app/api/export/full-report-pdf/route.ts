// src/app/api/export/full-report-pdf/route.ts
//
// Wedding Pass export. Gated the same way every other Pass action is —
// the UI only shows this link once the Pass is unlocked, but the route
// re-checks requirePass() itself, since a URL can always be hit directly
// regardless of what the UI shows.

import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan, requireSession } from "@/lib/session";
import { requirePass } from "@/lib/plan";
import { calculateBudgetSummary } from "@/lib/budget";
import { calculateGuestStats } from "@/lib/guests";
import { generateFullReportPdf } from "@/lib/pdf";

export async function GET() {
  await requireSession();
  const weddingPlan = await getCurrentWeddingPlan();
  if (!weddingPlan) return new Response("No wedding plan found", { status: 404 });

  const gate = requirePass(weddingPlan, "The full report export");
  if (!gate.allowed) return new Response(gate.upgradeReason, { status: 403 });

  const [checklistItems, budgetCategories, guests] = await Promise.all([
    prisma.checklistItem.findMany({
      where: { weddingPlanId: weddingPlan.id },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }],
    }),
    prisma.budgetCategory.findMany({ where: { weddingPlanId: weddingPlan.id } }),
    prisma.guest.findMany({ where: { weddingPlanId: weddingPlan.id } }),
  ]);

  const budgetSummary = calculateBudgetSummary(weddingPlan.totalBudgetGHS, budgetCategories);
  const stats = calculateGuestStats(guests);
  // Attendee counts (a +1 is 2 people), not guest-row counts — see lib/guests.ts.
  const guestSummary = {
    total: stats.totalAttendees,
    confirmed: stats.confirmedAttendees,
    pending: stats.pendingAttendees,
    declined: stats.declinedAttendees,
  };

  const pdfBytes = await generateFullReportPdf(weddingPlan, checklistItems, budgetSummary, guestSummary);

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slugify(weddingPlan.coupleNames)}-full-report.pdf"`,
    },
  });
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
