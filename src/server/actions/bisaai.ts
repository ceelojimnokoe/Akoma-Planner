// src/server/actions/bisaai.ts
//
// Thin Server Action wrappers around src/lib/bisaai.ts for the BisaAI
// chat/tools page. This is the one place plan-gating happens for these
// specific tools — lib/bisaai.ts itself has no concept of Free vs Pro (see
// the header comment in that file). basicQA is the only function here
// that's free; every other tool requires Pro.

"use server";

import { prisma } from "@/lib/prisma";
import { requirePass } from "@/lib/plan";
import * as bisaai from "@/lib/bisaai";

async function getWeddingPlan(weddingPlanId: string) {
  return prisma.weddingPlan.findUniqueOrThrow({ where: { id: weddingPlanId } });
}

export async function askBasicQA(weddingPlanId: string, question: string) {
  return bisaai.basicQA({ weddingPlanId, question });
}

export async function runShoppingList(weddingPlanId: string) {
  const plan = await getWeddingPlan(weddingPlanId);
  const gate = requirePass(plan, "The AI shopping list");
  if (!gate.allowed) return { ok: false as const, error: gate.upgradeReason };
  return bisaai.generateShoppingList({ weddingPlanId, guestEstimate: plan.guestEstimate });
}

export async function runDecorMoodboard(weddingPlanId: string, style: string, colorPalette: string) {
  const plan = await getWeddingPlan(weddingPlanId);
  const gate = requirePass(plan, "The decor moodboard generator");
  if (!gate.allowed) return { ok: false as const, error: gate.upgradeReason };
  return bisaai.decorMoodboard({
    weddingPlanId,
    style: style || undefined,
    colorPalette: colorPalette ? colorPalette.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
  });
}

export async function runHoneymoonRecommendations(weddingPlanId: string, budgetGHS?: number) {
  const plan = await getWeddingPlan(weddingPlanId);
  const gate = requirePass(plan, "Honeymoon recommendations");
  if (!gate.allowed) return { ok: false as const, error: gate.upgradeReason };
  return bisaai.honeymoonRecommendations({ weddingPlanId, budgetGHS });
}

export async function runSuggestHashtags(weddingPlanId: string) {
  const plan = await getWeddingPlan(weddingPlanId);
  const gate = requirePass(plan, "Hashtag suggestions");
  if (!gate.allowed) return { ok: false as const, error: gate.upgradeReason };
  return bisaai.suggestHashtags({ weddingPlanId });
}

export async function runGenerateSocialPost(weddingPlanId: string, platform: "instagram" | "facebook") {
  const plan = await getWeddingPlan(weddingPlanId);
  const gate = requirePass(plan, "Social post generation");
  if (!gate.allowed) return { ok: false as const, error: gate.upgradeReason };
  return bisaai.generateSocialPost({ weddingPlanId, platform });
}

export async function runDraftEmailInvite(weddingPlanId: string, guestName: string) {
  const plan = await getWeddingPlan(weddingPlanId);
  const gate = requirePass(plan, "Email invite drafting");
  if (!gate.allowed) return { ok: false as const, error: gate.upgradeReason };
  return bisaai.draftEmailInvite({ weddingPlanId, guestName: guestName || undefined });
}

// Note: no photo is ever passed in here — see the "why no photo
// parameter" comment on bisaai.dressTryOn() itself. This wrapper only
// forwards the consent flag and an optional style label.
export async function runDressTryOn(weddingPlanId: string, consentGiven: boolean, dressStyle: string) {
  const plan = await getWeddingPlan(weddingPlanId);
  const gate = requirePass(plan, "Dress try-on");
  if (!gate.allowed) return { ok: false as const, error: gate.upgradeReason };
  return bisaai.dressTryOn({ weddingPlanId, consentGiven, dressStyle: dressStyle || undefined });
}
