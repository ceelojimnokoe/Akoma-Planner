// src/server/actions/honeymoon.ts
//
// Mutations for the Honeymoon Planner Pass feature. HoneymoonPlan is 1:1
// per wedding (weddingPlanId @unique) — createOrUpdateHoneymoonPlan is an
// upsert so the same action covers first-time setup and later edits, no
// separate "create" vs "edit" code path needed. Deliberately no link to
// BudgetCategory/WeddingPlan.totalBudgetGHS anywhere in this file — the
// whole point of this feature is a standalone budget (see the model's own
// schema comment).

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePass } from "@/lib/plan";

const planInputSchema = z.object({
  weddingPlanId: z.string().min(1),
  destination: z.string().trim().max(150).optional(),
  styles: z.array(z.string().max(40)).max(10).default([]),
  allocatedGHS: z.coerce.number().min(0).max(50_000_000).optional(),
});

export async function createOrUpdateHoneymoonPlan(input: {
  weddingPlanId: string;
  destination?: string;
  styles: string[];
  allocatedGHS?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = planInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: parsed.data.weddingPlanId } });
  const gate = requirePass(weddingPlan, "Honeymoon Planner");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  const destination = parsed.data.destination?.trim() || null;
  const styles = parsed.data.styles.join(", ");

  await prisma.honeymoonPlan.upsert({
    where: { weddingPlanId: parsed.data.weddingPlanId },
    create: {
      weddingPlanId: parsed.data.weddingPlanId,
      destination,
      styles,
      allocatedGHS: parsed.data.allocatedGHS ?? 0,
    },
    update: {
      destination,
      styles,
      ...(parsed.data.allocatedGHS !== undefined && { allocatedGHS: parsed.data.allocatedGHS }),
    },
  });

  revalidatePath("/honeymoon");
  revalidatePath("/dashboard");
  return { ok: true };
}

const budgetInputSchema = z.object({
  weddingPlanId: z.string().min(1),
  allocatedGHS: z.coerce.number().min(0).max(50_000_000).optional(),
  spentGHS: z.coerce.number().min(0).max(50_000_000).optional(),
});

export async function updateHoneymoonBudget(input: {
  weddingPlanId: string;
  allocatedGHS?: number;
  spentGHS?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = budgetInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: parsed.data.weddingPlanId } });
  const gate = requirePass(weddingPlan, "Honeymoon Planner");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  await prisma.honeymoonPlan.update({
    where: { weddingPlanId: parsed.data.weddingPlanId },
    data: {
      ...(parsed.data.allocatedGHS !== undefined && { allocatedGHS: parsed.data.allocatedGHS }),
      ...(parsed.data.spentGHS !== undefined && { spentGHS: parsed.data.spentGHS }),
    },
  });

  revalidatePath("/honeymoon");
  return { ok: true };
}

export async function toggleHoneymoonChecklistItem(id: string, done: boolean): Promise<{ ok: boolean; error?: string }> {
  const item = await prisma.honeymoonChecklistItem.findUniqueOrThrow({ where: { id } });
  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: item.weddingPlanId } });
  const gate = requirePass(weddingPlan, "Honeymoon Planner");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  await prisma.honeymoonChecklistItem.update({ where: { id }, data: { done } });
  revalidatePath("/honeymoon");
  return { ok: true };
}
