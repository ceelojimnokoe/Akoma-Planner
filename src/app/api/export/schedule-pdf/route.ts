// src/app/api/export/schedule-pdf/route.ts
//
// Free-tier export. A real app/api/* route handler (not a Server Action)
// because this genuinely is a file download endpoint, not a form
// mutation — matches the "use route handlers for actual endpoints"
// distinction from LEARNING.md #1.

import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { generateSchedulePdf } from "@/lib/pdf";

export async function GET() {
  const weddingPlan = await getCurrentWeddingPlan();
  if (!weddingPlan) return new Response("No wedding plan found", { status: 404 });

  const checklistItems = await prisma.checklistItem.findMany({
    where: { weddingPlanId: weddingPlan.id },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }],
  });

  const pdfBytes = await generateSchedulePdf(weddingPlan, checklistItems);

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slugify(weddingPlan.coupleNames)}-schedule.pdf"`,
    },
  });
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
