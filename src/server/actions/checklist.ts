// src/server/actions/checklist.ts
//
// Mutations for the Checklist tool. Toggling/deleting is unrestricted on
// both plans (you can always manage what's already there); adding a new
// *custom* task is the one place the Free-plan cap from lib/plan.ts
// applies — default (isDefault: true) items seeded at onboarding never
// count against it.

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canAddChecklistItem } from "@/lib/plan";

export async function toggleChecklistItem(id: string, done: boolean): Promise<{ ok: boolean }> {
  await prisma.checklistItem.update({ where: { id }, data: { done } });
  revalidatePath("/checklist");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Changes a task's priority (LOW/MEDIUM/HIGH) — affects the badge shown on
 *  the Checklist page and whether it can show up in the Dashboard's
 *  "This week's focus" list (HIGH + not done only). No plan gate: editing
 *  what's already there is always allowed, same reasoning as toggling done. */
export async function updateChecklistItemPriority(
  id: string,
  priority: "LOW" | "MEDIUM" | "HIGH"
): Promise<{ ok: boolean }> {
  await prisma.checklistItem.update({ where: { id }, data: { priority } });
  revalidatePath("/checklist");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteChecklistItem(id: string): Promise<{ ok: boolean }> {
  await prisma.checklistItem.delete({ where: { id } });
  revalidatePath("/checklist");
  revalidatePath("/dashboard");
  return { ok: true };
}

const addInputSchema = z.object({
  weddingPlanId: z.string().min(1),
  title: z.string().trim().min(2, "Give the task a title").max(120),
  category: z.string().trim().min(1, "Pick or type a category").max(50),
  dueDate: z.coerce.date().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

export async function addChecklistItem(input: {
  weddingPlanId: string;
  title: string;
  category: string;
  dueDate?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = addInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: parsed.data.weddingPlanId } });
  const customItemCount = await prisma.checklistItem.count({
    where: { weddingPlanId: parsed.data.weddingPlanId, isDefault: false },
  });
  const gate = canAddChecklistItem(weddingPlan, customItemCount);
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  await prisma.checklistItem.create({
    data: {
      weddingPlanId: parsed.data.weddingPlanId,
      title: parsed.data.title,
      category: parsed.data.category,
      dueDate: parsed.data.dueDate,
      priority: parsed.data.priority,
      isDefault: false,
    },
  });

  revalidatePath("/checklist");
  revalidatePath("/dashboard");
  return { ok: true };
}
