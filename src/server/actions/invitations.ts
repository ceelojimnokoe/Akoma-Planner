// src/server/actions/invitations.ts
//
// Persists the couple's chosen invitation template
// (WeddingPlan.selectedInvitationTemplateId) — previously the gallery had
// no concept of a "chosen" template at all, just a static display grid.
// No requirePass() gate on the action itself: free templates must stay
// selectable by Free accounts, same reasoning as updateGuestGroup in
// server/actions/seating.ts. Instead this validates per-template — a
// pass-tier id is only accepted if the wedding already has the Pass,
// mirroring what the UI already prevents (locked cards aren't
// clickable) as a server-side backstop.

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getInvitationTemplateMeta } from "@/lib/invitation-templates";

export interface InvitationActionResult {
  ok: boolean;
  error?: string;
}

export async function selectInvitationTemplate(weddingPlanId: string, templateId: string): Promise<InvitationActionResult> {
  const template = getInvitationTemplateMeta(templateId);
  if (!template) return { ok: false, error: "That template doesn't exist." };

  if (template.tier === "pass") {
    const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: weddingPlanId } });
    if (!weddingPlan.hasWeddingPass) {
      return { ok: false, error: `${template.name} is part of the Wedding Pass.` };
    }
  }

  await prisma.weddingPlan.update({
    where: { id: weddingPlanId },
    data: { selectedInvitationTemplateId: templateId },
  });
  revalidatePath("/design");
  return { ok: true };
}
