// src/components/onboarding/onboarding-types.ts
//
// Shared form-state shape for the whole wizard. Every field is a plain
// string/boolean (matching what raw <input>/<select> elements naturally
// produce) even where the underlying data is a number, date, or enum —
// the server action's zod schema (lib/validation/wedding.ts) is what
// actually coerces/validates on submit, same division of labor as the
// original single-page OnboardingForm had.

import { ONBOARDING_VENDOR_CATEGORIES } from "@/lib/validation/wedding";

export interface OnboardingFormData {
  // Wedding Details (core)
  coupleNames: string;
  weddingDate: string;
  city: "ACCRA" | "KUMASI" | "OTHER";
  guestEstimate: string;
  tradition: string;
  totalBudgetGHS: string;

  // Couple information
  partner1Name: string;
  partner2Name: string;
  displayName1: string;
  displayName2: string;
  partner1Phone: string;
  partner2Phone: string;
  partner2Email: string;

  // Wedding details extras
  ceremonyDate: string;
  receptionDate: string;
  venueName: string;
  indoorOutdoor: "" | "INDOOR" | "OUTDOOR" | "BOTH";
  weddingType: "" | "TRADITIONAL" | "WHITE_WEDDING" | "CIVIL" | "DESTINATION" | "MULTIPLE_CEREMONIES";

  // Guest information extras
  bridalPartySize: string;
  groomPartySize: string;

  // Budget
  budgetFlexibility: "" | "STRICT" | "SOMEWHAT_FLEXIBLE" | "VERY_FLEXIBLE";
  isDiaspora: boolean;

  // Wedding style
  theme: string;
  colorPalette: string;
  dressCode: string;
  visionNotes: string;
  pinterestUrl: string;

  // Planning preferences
  biggestConcern: string;
  planningExperience: "" | "FIRST_TIME" | "PLANNED_BEFORE" | "HIRING_A_PLANNER";
  diyVsProfessional: "" | "MOSTLY_DIY" | "MOSTLY_PROFESSIONAL" | "A_MIX";
  needVendorRecommendations: boolean;
  needTimelineAssistance: boolean;
  communicationStyle: "" | "DETAILED_EXPLANATIONS" | "QUICK_SUMMARIES" | "WEEKLY_CHECK_IN";

  // Vendor status — always fully populated, one entry per category
  vendorStatus: Record<string, "NOT_STARTED" | "RESEARCHING" | "BOOKED">;

  // Relationship
  proposalDate: string;
  engagementDate: string;
  loveStory: string;

  // Additional notes
  specialRequests: string;
  accessibilityRequirements: string;
  culturalReligiousRequirements: string;
}

export function emptyOnboardingForm(prefillName?: string): OnboardingFormData {
  return {
    coupleNames: "",
    weddingDate: "",
    city: "ACCRA",
    guestEstimate: "",
    tradition: "",
    totalBudgetGHS: "",

    partner1Name: prefillName ?? "",
    partner2Name: "",
    displayName1: "",
    displayName2: "",
    partner1Phone: "",
    partner2Phone: "",
    partner2Email: "",

    ceremonyDate: "",
    receptionDate: "",
    venueName: "",
    indoorOutdoor: "",
    weddingType: "",

    bridalPartySize: "",
    groomPartySize: "",

    budgetFlexibility: "",
    isDiaspora: false,

    theme: "",
    colorPalette: "",
    dressCode: "",
    visionNotes: "",
    pinterestUrl: "",

    biggestConcern: "",
    planningExperience: "",
    diyVsProfessional: "",
    needVendorRecommendations: true,
    needTimelineAssistance: true,
    communicationStyle: "",

    vendorStatus: Object.fromEntries(ONBOARDING_VENDOR_CATEGORIES.map((c) => [c.value, "NOT_STARTED"])),

    proposalDate: "",
    engagementDate: "",
    loveStory: "",

    specialRequests: "",
    accessibilityRequirements: "",
    culturalReligiousRequirements: "",
  };
}

export interface StepProps {
  form: OnboardingFormData;
  update: <K extends keyof OnboardingFormData>(key: K, value: OnboardingFormData[K]) => void;
  errors?: Partial<Record<string, string>>;
}
