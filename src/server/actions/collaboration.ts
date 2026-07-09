// src/server/actions/collaboration.ts
//
// Mutations for the Collaboration tool: adding/removing WeddingMember
// rows, and regenerating the public share token. Pro-gated throughout.
//
// IMPORTANT MVP LIMITATION, stated plainly rather than glossed over:
// there is no real invite/auth flow. "Adding" a fiancé or planner here
// creates (or reuses) a User row by email and links it as a
// WeddingMember directly — no invite email is sent, no acceptance step,
// no login for that person. This is an honest stand-in for what a real
// invite system would do once src/lib/session.ts's stubbed auth is
// replaced with something real (see LEARNING.md #5).

"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePro } from "@/lib/plan";

async function requireProForWedding(weddingPlanId: string, featureLabel: string) {
  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: weddingPlanId } });
  return requirePro(weddingPlan.plan, featureLabel);
}

const addCollaboratorSchema = z.object({
  weddingPlanId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(["PARTNER", "PLANNER", "COLLABORATOR"]),
});

export async function addCollaborator(input: {
  weddingPlanId: string;
  name: string;
  email: string;
  role: "PARTNER" | "PLANNER" | "COLLABORATOR";
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = addCollaboratorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const gate = await requireProForWedding(input.weddingPlanId, "Collaboration");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  const user = await prisma.user.upsert({
    where: { email: parsed.data.email },
    create: { email: parsed.data.email, name: parsed.data.name },
    update: {},
  });

  const existingMember = await prisma.weddingMember.findUnique({
    where: { userId_weddingPlanId: { userId: user.id, weddingPlanId: parsed.data.weddingPlanId } },
  });
  if (existingMember) return { ok: false, error: `${parsed.data.name} is already a collaborator on this wedding.` };

  await prisma.weddingMember.create({
    data: { userId: user.id, weddingPlanId: parsed.data.weddingPlanId, role: parsed.data.role },
  });

  revalidatePath("/collaboration");
  return { ok: true };
}

export async function removeCollaborator(memberId: string, weddingPlanId: string): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireProForWedding(weddingPlanId, "Collaboration");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  const member = await prisma.weddingMember.findUniqueOrThrow({ where: { id: memberId } });
  if (member.role === "OWNER") return { ok: false, error: "The wedding owner can't be removed." };

  await prisma.weddingMember.delete({ where: { id: memberId } });
  revalidatePath("/collaboration");
  return { ok: true };
}

export async function regenerateShareToken(weddingPlanId: string): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireProForWedding(weddingPlanId, "Collaboration");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  await prisma.weddingPlan.update({ where: { id: weddingPlanId }, data: { shareToken: randomUUID() } });
  revalidatePath("/collaboration");
  return { ok: true };
}
