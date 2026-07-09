// src/app/api/export/full-report-pdf/route.ts
//
// Pro-tier export. Gated the same way every other Pro action is — the
// UI only shows this link on Pro, but the route re-checks requirePro()
// itself, since a URL can always be hit directly regardless of what the
// UI shows.

import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { requirePro } from "@/lib/plan";
import { calculateBudgetSummary } from "@/lib/budget";
import { generateFullReportPdf } from "@/lib/pdf";

export async function GET() {
  const weddingPlan = await getCurrentWeddingPlan();
  if (!weddingPlan) return new Response("No wedding plan found", { status: 404 });

  const gate = requirePro(weddingPlan.plan, "The full report export");
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
  const guestSummary = {
    total: guests.length,
    confirmed: guests.filter((g) => g.rsvpStatus === "YES").length,
    pending: guests.filter((g) => g.rsvpStatus === "PENDING").length,
    declined: guests.filter((g) => g.rsvpStatus === "NO").length,
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
