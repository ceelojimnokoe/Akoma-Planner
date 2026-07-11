// src/lib/validation/wedding.ts
//
// Zod schema for the onboarding wizard. Same principle as before it grew:
// this is the one place "is this a valid wedding setup?" is defined, and
// the server action is the real security boundary (client-side validation
// can always be bypassed).
//
// The six original fields (coupleNames..totalBudgetGHS) map straight onto
// WeddingPlan and stay required, exactly as before. Everything else is new
// — it maps onto CoupleProfile and VendorBookingStatus (see
// server/actions/wedding.ts) and is optional throughout, since a couple can
// always fill more in later from /profile. Optional dates/numbers are kept
// as loosely-typed strings here rather than coerced — the server action
// does that shaping once it knows which fields are actually present,
// which is simpler than fighting zod's coercion rules on empty strings.

import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

function optionalEnum<T extends [string, ...string[]]>(values: T) {
  return z.union([z.literal(""), z.enum(values)]).optional();
}

// Native <input type="color"> always sends a 6-digit hex value, so this
// only rejects genuinely malformed input, not "no color chosen" — that
// case is just "" (the field left untouched / cleared).
const optionalHexColor = z.union([z.literal(""), z.string().regex(/^#[0-9a-fA-F]{6}$/, "Enter a valid color")]).optional();

export const onboardingSchema = z.object({
  // --- Wedding Details (core — maps onto WeddingPlan, required) ---
  coupleNames: z.string().trim().min(2, 'Enter both names, e.g. "Ama & Kwame"').max(100),
  weddingDate: z.coerce.date({ message: "Enter a valid date" }),
  city: z.enum(["ACCRA", "KUMASI", "OTHER"]),
  guestEstimate: z.coerce.number().int().min(1, "Guest estimate must be at least 1").max(20000),
  tradition: z.string().trim().min(2, 'e.g. "Akan", "Ewe", "Interfaith"').max(50),
  totalBudgetGHS: z.coerce.number().min(0, "Budget can't be negative").max(50_000_000),

  // --- Couple information ---
  partner1Name: optionalText(100),
  partner2Name: optionalText(100),
  displayName1: optionalText(50),
  displayName2: optionalText(50),
  partner1Phone: optionalText(30),
  partner2Phone: optionalText(30),
  partner2Email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),

  // --- Wedding details extras ---
  ceremonyDate: optionalText(20),
  receptionDate: optionalText(20),
  venueName: optionalText(150),
  indoorOutdoor: optionalEnum(["INDOOR", "OUTDOOR", "BOTH"]),
  weddingType: optionalEnum(["TRADITIONAL", "WHITE_WEDDING", "CIVIL", "DESTINATION", "MULTIPLE_CEREMONIES"]),

  // --- Guest information extras ---
  bridalPartySize: z.coerce.number().int().min(0).max(200).optional(),
  groomPartySize: z.coerce.number().int().min(0).max(200).optional(),

  // --- Budget extras (isDiaspora replaces a currency picker — app stays GHS-only) ---
  budgetFlexibility: optionalEnum(["STRICT", "SOMEWHAT_FLEXIBLE", "VERY_FLEXIBLE"]),
  isDiaspora: z.boolean().optional(),

  // --- Wedding style ---
  theme: optionalText(100),
  primaryColor: optionalHexColor,
  secondaryColor: optionalHexColor,
  dressCode: optionalText(100),
  visionNotes: optionalText(1000),
  pinterestUrl: z.union([z.literal(""), z.string().trim().url("Enter a valid URL")]).optional(),

  // --- Planning preferences ---
  biggestConcern: optionalText(500),
  planningExperience: optionalEnum(["FIRST_TIME", "PLANNED_BEFORE", "HIRING_A_PLANNER"]),
  diyVsProfessional: optionalEnum(["MOSTLY_DIY", "MOSTLY_PROFESSIONAL", "A_MIX"]),
  needVendorRecommendations: z.boolean().optional(),
  needTimelineAssistance: z.boolean().optional(),
  communicationStyle: optionalEnum(["DETAILED_EXPLANATIONS", "QUICK_SUMMARIES", "WEEKLY_CHECK_IN"]),

  // --- Vendor status: one entry per category (see ONBOARDING_VENDOR_CATEGORIES) ---
  vendorStatus: z.record(
    z.enum([
      "VENUE",
      "PHOTOGRAPHER",
      "VIDEOGRAPHER",
      "CATERER",
      "DJ_BAND",
      "MC",
      "DECOR",
      "FLORIST",
      "MAKEUP",
      "HAIR",
      "CAKE",
      "TRANSPORTATION",
    ]),
    z.enum(["NOT_STARTED", "RESEARCHING", "BOOKED"])
  ),

  // --- Relationship ---
  proposalDate: optionalText(20),
  engagementDate: optionalText(20),
  loveStory: optionalText(2000),

  // --- Additional notes ---
  specialRequests: optionalText(1000),
  accessibilityRequirements: optionalText(1000),
  culturalReligiousRequirements: optionalText(1000),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

// The 12 categories the Vendor Status step asks about — a separate list
// from the real Vendor catalog's categories, see schema.prisma's
// OnboardingVendorCategory comment for why.
export const ONBOARDING_VENDOR_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "VENUE", label: "Venue" },
  { value: "PHOTOGRAPHER", label: "Photographer" },
  { value: "VIDEOGRAPHER", label: "Videographer" },
  { value: "CATERER", label: "Caterer" },
  { value: "DJ_BAND", label: "DJ / Band" },
  { value: "MC", label: "MC" },
  { value: "DECOR", label: "Decor" },
  { value: "FLORIST", label: "Florist" },
  { value: "MAKEUP", label: "Makeup" },
  { value: "HAIR", label: "Hair" },
  { value: "CAKE", label: "Cake" },
  { value: "TRANSPORTATION", label: "Transportation" },
];
