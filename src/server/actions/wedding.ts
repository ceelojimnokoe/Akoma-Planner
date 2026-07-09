// src/server/actions/wedding.ts
//
// Server Actions ("use server") for wedding-plan-level mutations. Thin by
// design: parse/validate input, apply the one plan-gating rule that
// applies, delegate the actual writes to Prisma, done. Business rules
// like "what's the default checklist" or "what's the default budget
// split" live in src/lib — this file just wires them together.

"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canCreateWeddingPlan } from "@/lib/plan";
import { weddingSetupSchema, type WeddingSetupInput } from "@/lib/validation/wedding";
import { buildDefaultChecklist } from "@/lib/checklist-defaults";
import { buildDefaultBudgetCategories } from "@/lib/budget-defaults";

export interface CreateWeddingPlanResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof WeddingSetupInput, string>>;
}

/**
 * Creates a new wedding plan for the current (stub) user, pre-populated
 * with a default checklist and a starter budget split. Redirects to the
 * dashboard on success, so callers only need to handle the failure case.
 */
export async function createWeddingPlan(rawInput: WeddingSetupInput): Promise<CreateWeddingPlanResult> {
  const parsed = weddingSetupSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof WeddingSetupInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof WeddingSetupInput;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const user = await getCurrentUser();

  // Defense in depth: the onboarding page already redirects away if the
  // user has an existing plan, but this action re-checks the real rule
  // here too, since a server action must never trust the caller skipped
  // a check the UI happens to also perform.
  const existingCount = await prisma.weddingPlan.count({ where: { ownerUserId: user.id } });
  const gate = canCreateWeddingPlan("FREE", existingCount);
  if (!gate.allowed) {
    return { ok: false, error: gate.upgradeReason };
  }

  const input = parsed.data;

  const weddingPlan = await prisma.weddingPlan.create({
    data: {
      coupleNames: input.coupleNames,
      weddingDate: input.weddingDate,
      totalBudgetGHS: input.totalBudgetGHS,
      city: input.city,
      guestEstimate: input.guestEstimate,
      tradition: input.tradition,
      ownerUserId: user.id,
      members: { create: { userId: user.id, role: "OWNER" } },
      checklistItems: { createMany: { data: buildDefaultChecklist(input.weddingDate) } },
      budgetCategories: { createMany: { data: buildDefaultBudgetCategories(input.totalBudgetGHS) } },
    },
  });

  redirect(`/dashboard?welcome=1&weddingPlanId=${weddingPlan.id}`);
}
