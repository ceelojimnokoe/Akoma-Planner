// src/lib/validation/profile.ts
//
// The /profile page edits the same fields the onboarding wizard collects
// (minus the core WeddingPlan fields and the vendor-status checklist,
// which live on the Wedding card in /settings and the Vendors page
// respectively) — reusing onboardingSchema.pick() keeps the two forms'
// validation rules from drifting apart.

import { z } from "zod";
import { onboardingSchema } from "@/lib/validation/wedding";

export const coupleProfileSchema = onboardingSchema.pick({
  partner1Name: true,
  partner2Name: true,
  displayName1: true,
  displayName2: true,
  partner1Phone: true,
  partner2Phone: true,
  partner2Email: true,
  ceremonyDate: true,
  receptionDate: true,
  venueName: true,
  indoorOutdoor: true,
  weddingType: true,
  bridalPartySize: true,
  groomPartySize: true,
  budgetFlexibility: true,
  isDiaspora: true,
  theme: true,
  colorPalette: true,
  dressCode: true,
  visionNotes: true,
  pinterestUrl: true,
  biggestConcern: true,
  planningExperience: true,
  diyVsProfessional: true,
  needVendorRecommendations: true,
  needTimelineAssistance: true,
  communicationStyle: true,
  proposalDate: true,
  engagementDate: true,
  loveStory: true,
  specialRequests: true,
  accessibilityRequirements: true,
  culturalReligiousRequirements: true,
});

export type CoupleProfileInput = z.infer<typeof coupleProfileSchema>;
