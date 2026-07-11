// src/server/actions/profile.ts
//
// Lets a couple fill in / edit onboarding answers after the fact, from
// /profile — same parse-then-write shape as every other server action.

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { coupleProfileSchema, type CoupleProfileInput } from "@/lib/validation/profile";
import { orUndefined, dateOrUndefined } from "@/lib/form-shaping";
import { createNotification } from "@/lib/notifications";
import type {
  IndoorOutdoor,
  WeddingType,
  BudgetFlexibility,
  PlanningExperience,
  DiyVsProfessional,
  CommunicationStyle,
} from "@prisma/client";

export interface UpdateCoupleProfileResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof CoupleProfileInput, string>>;
}

export async function updateCoupleProfile(rawInput: CoupleProfileInput): Promise<UpdateCoupleProfileResult> {
  const parsed = coupleProfileSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof CoupleProfileInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof CoupleProfileInput;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const weddingPlan = await getCurrentWeddingPlan();
  if (!weddingPlan) {
    return { ok: false, error: "No wedding plan found for your account." };
  }

  const input = parsed.data;
  const data = {
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
  };

  await prisma.coupleProfile.upsert({
    where: { weddingPlanId: weddingPlan.id },
    create: { weddingPlanId: weddingPlan.id, ...data },
    update: data,
  });

  // A unique key per call (not a fixed one like the state-derived
  // notifications use) — every edit is its own event and should show up
  // as a fresh unread notification, not silently coalesce into one
  // permanent row the way a re-synced fact would.
  await createNotification({
    weddingPlanId: weddingPlan.id,
    key: `profile-updated-${Date.now()}`,
    type: "SYSTEM",
    message: "Your profile was updated successfully.",
    actionHref: "/profile",
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}
