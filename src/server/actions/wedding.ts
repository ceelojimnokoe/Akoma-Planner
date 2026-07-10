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
import { onboardingSchema, type OnboardingInput } from "@/lib/validation/wedding";
import { buildDefaultChecklist } from "@/lib/checklist-defaults";
import { buildDefaultBudgetCategories } from "@/lib/budget-defaults";
import { orUndefined, dateOrUndefined } from "@/lib/form-shaping";
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
          colorPalette: orUndefined(input.colorPalette),
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
    },
  });

  redirect(`/dashboard?welcome=1&weddingPlanId=${weddingPlan.id}`);
}
