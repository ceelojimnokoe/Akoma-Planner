// src/server/actions/traditional-ceremony.ts
//
// Mutations for the Traditional Ceremony Pass feature — add/update/delete
// a tracked item, each independently re-checking requirePass() server-side
// (defense in depth: never trust that a request only ever came from behind
// the page's own gate). Every mutation that touches spentGHS re-derives
// the matched "Traditional Customary" BudgetCategory's own spentGHS as a
// mirror of the sum of all items — the one-way-per-field sync described in
// lib/budget-defaults.ts's header comment (allocatedGHS flows Budget →
// here, spentGHS flows here → Budget; BudgetCategoryRow.tsx renders that
// one row's Spent cell read-only once matched, so the two views can never
// clobber each other).

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePass } from "@/lib/plan";
import { matchBudgetCategoryByName } from "@/lib/budget-fit";
import { TRADITIONAL_CUSTOMARY_BUDGET_NAME } from "@/lib/traditional-ceremony-defaults";

async function syncTraditionalCustomaryBudget(weddingPlanId: string) {
  const [items, budgetCategories] = await Promise.all([
    prisma.traditionalCeremonyItem.findMany({ where: { weddingPlanId }, select: { spentGHS: true } }),
    prisma.budgetCategory.findMany({ where: { weddingPlanId } }),
  ]);
  const matched = matchBudgetCategoryByName(TRADITIONAL_CUSTOMARY_BUDGET_NAME, budgetCategories);
  if (!matched) return; // no match, no crash — same convention as budget-fit.ts

  const totalSpentGHS = items.reduce((sum, i) => sum + i.spentGHS, 0);
  if (totalSpentGHS !== matched.spentGHS) {
    await prisma.budgetCategory.update({ where: { id: matched.id }, data: { spentGHS: totalSpentGHS } });
  }
}

function revalidateAll() {
  revalidatePath("/traditional-ceremony");
  revalidatePath("/budget");
  revalidatePath("/dashboard");
}

const addInputSchema = z.object({
  weddingPlanId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(100),
  category: z.string().trim().min(1, "Category is required").max(60),
  allocatedGHS: z.coerce.number().min(0).max(50_000_000),
});

export async function addTraditionalCeremonyItem(input: {
  weddingPlanId: string;
  name: string;
  category: string;
  allocatedGHS: number;
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = addInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: parsed.data.weddingPlanId } });
  const gate = requirePass(weddingPlan, "Traditional Ceremony");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  await prisma.traditionalCeremonyItem.create({
    data: {
      weddingPlanId: parsed.data.weddingPlanId,
      name: parsed.data.name,
      category: parsed.data.category,
      allocatedGHS: parsed.data.allocatedGHS,
    },
  });

  revalidateAll();
  return { ok: true };
}

const updateInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  allocatedGHS: z.coerce.number().min(0).max(50_000_000).optional(),
  spentGHS: z.coerce.number().min(0).max(50_000_000).optional(),
  done: z.boolean().optional(),
});

export async function updateTraditionalCeremonyItem(input: {
  id: string;
  name?: string;
  category?: string;
  allocatedGHS?: number;
  spentGHS?: number;
  done?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = updateInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const item = await prisma.traditionalCeremonyItem.findUniqueOrThrow({ where: { id: parsed.data.id } });
  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: item.weddingPlanId } });
  const gate = requirePass(weddingPlan, "Traditional Ceremony");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  await prisma.traditionalCeremonyItem.update({
    where: { id: parsed.data.id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.category !== undefined && { category: parsed.data.category }),
      ...(parsed.data.allocatedGHS !== undefined && { allocatedGHS: parsed.data.allocatedGHS }),
      ...(parsed.data.spentGHS !== undefined && { spentGHS: parsed.data.spentGHS }),
      ...(parsed.data.done !== undefined && { done: parsed.data.done }),
    },
  });

  if (parsed.data.spentGHS !== undefined) await syncTraditionalCustomaryBudget(item.weddingPlanId);

  revalidateAll();
  return { ok: true };
}

export async function deleteTraditionalCeremonyItem(id: string): Promise<{ ok: boolean; error?: string }> {
  const item = await prisma.traditionalCeremonyItem.findUniqueOrThrow({ where: { id } });
  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: item.weddingPlanId } });
  const gate = requirePass(weddingPlan, "Traditional Ceremony");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  await prisma.traditionalCeremonyItem.delete({ where: { id } });
  await syncTraditionalCustomaryBudget(item.weddingPlanId);

  revalidateAll();
  return { ok: true };
}
