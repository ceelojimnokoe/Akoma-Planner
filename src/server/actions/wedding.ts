// src/server/actions/wedding.ts
//
// Server Actions ("use server") for wedding-plan-level mutations. Thin by
// design: parse/validate input, apply the one plan-gating rule that
// applies, delegate the actual writes to Prisma, done. Business rules
// like "what's the default checklist" or "what's the default budget
// split" live in src/lib — this file just wires them together.

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canCreateWeddingPlan, canSetGuestEstimate } from "@/lib/plan";
import { onboardingSchema, type OnboardingInput } from "@/lib/validation/wedding";
import { buildDefaultChecklist } from "@/lib/checklist-defaults";
import { buildDefaultBudgetCategories } from "@/lib/budget-defaults";
import { buildDefaultTraditionalCeremonyItems, resolveTraditionalCeremonyCatalogCity } from "@/lib/traditional-ceremony-defaults";
import { buildDefaultHoneymoonChecklist } from "@/lib/honeymoon-defaults";
import { orUndefined, dateOrUndefined } from "@/lib/form-shaping";
import { createNotification } from "@/lib/notifications";
import type {
  OnboardingVendorCategory,
  IndoorOutdoor,
  WeddingType,
  BudgetFlexibility,
  PlanningExperience,
  DiyVsProfessional,
  CommunicationStyle,
} from "@prisma/client";

export interface CreateWeddingPlanResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof OnboardingInput, string>>;
}

/**
 * Creates a new wedding plan for the current user, pre-populated with a
 * default checklist, a starter budget split, the couple's onboarding
 * profile, and their vendor-booking checklist. Redirects to the dashboard
 * on success, so callers only need to handle the failure case.
 */
export async function createWeddingPlan(rawInput: OnboardingInput): Promise<CreateWeddingPlanResult> {
  const parsed = onboardingSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof OnboardingInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof OnboardingInput;
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
  // No WeddingPlan row exists yet at this point (that's what's being
  // checked — whether the user may create one) — hasWeddingPass lives on
  // WeddingPlan, so a brand-new user never has it yet, definitionally.
  const gate = canCreateWeddingPlan({ hasWeddingPass: false }, existingCount);
  if (!gate.allowed) {
    return { ok: false, error: gate.upgradeReason };
  }

  const input = parsed.data;

  // Traditional Ceremony's per-couple defaults are copied from the global
  // TraditionalListItem catalog, filtered by city — one extra read before
  // the main create() below (see lib/traditional-ceremony-defaults.ts for
  // why "Other" falls back to Accra's catalog rather than seeding nothing).
  const traditionalCatalogItems = await prisma.traditionalListItem.findMany({
    where: { city: resolveTraditionalCeremonyCatalogCity(input.city) },
  });

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
      budgetCategories: { createMany: { data: buildDefaultBudgetCategories() } },
      coupleProfile: {
        create: {
          partner1Name: orUndefined(input.partner1Name),
          partner2Name: orUndefined(input.partner2Name),
          displayName1: orUndefined(input.displayName1),
          displayName2: orUndefined(input.displayName2),
          partner1Phone: orUndefined(input.partner1Phone),
          partner2Phone: orUndefined(input.partner2Phone),
          partner2Email: orUndefined(input.partner2Email),
          ceremonyDate: dateOrUndefined(input.ceremonyDate),
          receptionDate: dateOrUndefined(input.receptionDate),
          venueName: orUndefined(input.venueName),
          indoorOutdoor: orUndefined(input.indoorOutdoor) as IndoorOutdoor | undefined,
          weddingType: orUndefined(input.weddingType) as WeddingType | undefined,
          bridalPartySize: input.bridalPartySize,
          groomPartySize: input.groomPartySize,
          budgetFlexibility: orUndefined(input.budgetFlexibility) as BudgetFlexibility | undefined,
          isDiaspora: input.isDiaspora ?? false,
          theme: orUndefined(input.theme),
          primaryColor: orUndefined(input.primaryColor),
          secondaryColor: orUndefined(input.secondaryColor),
          dressCode: orUndefined(input.dressCode),
          visionNotes: orUndefined(input.visionNotes),
          pinterestUrl: orUndefined(input.pinterestUrl),
          biggestConcern: orUndefined(input.biggestConcern),
          planningExperience: orUndefined(input.planningExperience) as PlanningExperience | undefined,
          diyVsProfessional: orUndefined(input.diyVsProfessional) as DiyVsProfessional | undefined,
          needVendorRecommendations: input.needVendorRecommendations ?? true,
          needTimelineAssistance: input.needTimelineAssistance ?? true,
          communicationStyle: orUndefined(input.communicationStyle) as CommunicationStyle | undefined,
          proposalDate: dateOrUndefined(input.proposalDate),
          engagementDate: dateOrUndefined(input.engagementDate),
          loveStory: orUndefined(input.loveStory),
          specialRequests: orUndefined(input.specialRequests),
          accessibilityRequirements: orUndefined(input.accessibilityRequirements),
          culturalReligiousRequirements: orUndefined(input.culturalReligiousRequirements),
        },
      },
      vendorBookingStatuses: {
        createMany: {
          data: Object.entries(input.vendorStatus).map(([category, status]) => ({
            category: category as OnboardingVendorCategory,
            status,
          })),
        },
      },
      traditionalCeremonyItems: { createMany: { data: buildDefaultTraditionalCeremonyItems(traditionalCatalogItems) } },
      honeymoonChecklistItems: { createMany: { data: buildDefaultHoneymoonChecklist() } },
    },
  });

  await createNotification({
    weddingPlanId: weddingPlan.id,
    key: "welcome",
    type: "SYSTEM",
    message: "Welcome to Akoma Planner! Your wedding dashboard is ready.",
    actionHref: "/dashboard",
  });

  redirect(`/onboarding/complete?weddingPlanId=${weddingPlan.id}`);
}

const guestEstimateSchema = z.coerce.number().int().min(1, "Guest estimate must be at least 1").max(20000);

export interface UpdateGuestEstimateResult {
  ok: boolean;
  error?: string;
  /** True specifically when a Free-plan cap blocked this — distinct from
   *  a plain validation error, so the UI can show the friendly
   *  UpgradePrompt treatment instead of a raw red error line. */
  upgradeRequired?: boolean;
}

/**
 * Edits the couple's own guest-count estimate after onboarding — a
 * distinct number from actual Guest rows on the guest list (see
 * canSetGuestEstimate in lib/plan.ts, a different gate from the one that
 * caps real guest rows added). Same 1-20000 range onboarding's own
 * GuestInfoStep already validates, so a couple can't drift the estimate
 * to a value the original wizard would never have accepted.
 */
export async function updateGuestEstimate(weddingPlanId: string, rawGuestEstimate: number): Promise<UpdateGuestEstimateResult> {
  const parsed = guestEstimateSchema.safeParse(rawGuestEstimate);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid guest estimate" };
  }

  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: weddingPlanId } });
  const gate = canSetGuestEstimate(weddingPlan, parsed.data);
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason, upgradeRequired: true };

  await prisma.weddingPlan.update({ where: { id: weddingPlanId }, data: { guestEstimate: parsed.data } });
  revalidatePath("/guests");
  revalidatePath("/dashboard");
  return { ok: true };
}
