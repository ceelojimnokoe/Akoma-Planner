// src/server/actions/budget.ts
//
// Mutations for the Budget tool. Free-tier feature — no requirePass()
// gate here at all (the basic budget calculator is fully usable without
// payment, per the product's free-tier rules). Each action revalidates
// both /budget and /dashboard since the dashboard shows a budget summary too.

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const categoryInputSchema = z.object({
  weddingPlanId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(60),
  allocatedGHS: z.coerce.number().min(0).max(50_000_000),
});

export async function addBudgetCategory(input: {
  weddingPlanId: string;
  name: string;
  allocatedGHS: number;
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.budgetCategory.create({
    data: {
      weddingPlanId: parsed.data.weddingPlanId,
      name: parsed.data.name,
      allocatedGHS: parsed.data.allocatedGHS,
    },
  });

  revalidatePath("/budget");
  revalidatePath("/dashboard");
  return { ok: true };
}

const updateInputSchema = z.object({
  id: z.string().min(1),
  allocatedGHS: z.coerce.number().min(0).max(50_000_000).optional(),
  spentGHS: z.coerce.number().min(0).max(50_000_000).optional(),
});

export async function updateBudgetCategory(input: {
  id: string;
  allocatedGHS?: number;
  spentGHS?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = updateInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.budgetCategory.update({
    where: { id: parsed.data.id },
    data: {
      ...(parsed.data.allocatedGHS !== undefined && { allocatedGHS: parsed.data.allocatedGHS }),
      ...(parsed.data.spentGHS !== undefined && { spentGHS: parsed.data.spentGHS }),
    },
  });

  revalidatePath("/budget");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteBudgetCategory(id: string): Promise<{ ok: boolean }> {
  await prisma.budgetCategory.delete({ where: { id } });
  revalidatePath("/budget");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Moves an amount from one category's allocation to another — one atomic
 * write via $transaction (same precedent as vendor-booking.ts's
 * replace-vendor transaction) so a failure partway through never leaves
 * money deducted from the source without landing in the destination.
 * Refuses a move that would leave the source category negative.
 */
export async function moveBudgetAmount(
  weddingPlanId: string,
  sourceCategoryId: string,
  destCategoryId: string,
  amountGHS: number
): Promise<{ ok: boolean; error?: string }> {
  if (amountGHS <= 0) return { ok: false, error: "Amount must be greater than zero." };
  if (sourceCategoryId === destCategoryId) return { ok: false, error: "Source and destination categories must be different." };

  const [source, dest] = await Promise.all([
    prisma.budgetCategory.findUniqueOrThrow({ where: { id: sourceCategoryId } }),
    prisma.budgetCategory.findUniqueOrThrow({ where: { id: destCategoryId } }),
  ]);
  if (source.weddingPlanId !== weddingPlanId || dest.weddingPlanId !== weddingPlanId) {
    return { ok: false, error: "Category does not belong to this wedding plan." };
  }
  if (amountGHS > source.allocatedGHS) {
    return { ok: false, error: `${source.name} only has ${source.allocatedGHS} GHS allocated — can't move ${amountGHS} GHS out of it.` };
  }

  await prisma.$transaction([
    prisma.budgetCategory.update({ where: { id: sourceCategoryId }, data: { allocatedGHS: source.allocatedGHS - amountGHS } }),
    prisma.budgetCategory.update({ where: { id: destCategoryId }, data: { allocatedGHS: dest.allocatedGHS + amountGHS } }),
  ]);

  revalidatePath("/budget");
  revalidatePath("/dashboard");
  return { ok: true };
}
