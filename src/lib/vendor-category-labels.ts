// src/lib/vendor-category-labels.ts
//
// Single source of truth for how the real Vendor catalog's VendorCategory
// enum renders as display text. Before this file existed, three
// independent naive title-casing helpers (VendorCard.tsx, lib/bisaai.ts,
// VendorFilters.tsx) each derived a label from the raw enum string —
// harmless while every value was a plain word, but "MC" would render as
// "Mc" under a charAt(0)+toLowerCase() transform. Same "one lookup, many
// call sites" convention as lib/vendor-booking-progress.ts's label maps.

import type { VendorCategory } from "@prisma/client";

export const VENDOR_CATEGORY_LABEL: Record<VendorCategory, string> = {
  VENUE: "Venue",
  CATERING: "Catering",
  PHOTOGRAPHY: "Photography",
  ATTIRE: "Attire",
  DECOR: "Decor",
  MUSIC: "Music",
  MAKEUP: "Makeup",
  TRANSPORT: "Transport",
  CAKE: "Cake",
  OTHER: "Other",
  JEWELLERY: "Jewellery",
  MC: "MC",
  PLANNER: "Wedding Planner",
};

// The reverse lookup: turns a word a BisaAI chat user might actually type
// ("photographers", "DJ", "caterer") into the enum value, for the
// FIND_VENDORS intent (src/lib/bisaai-intent.ts). Deliberately separate
// from VENDOR_CATEGORY_TO_BUDGET_KEYWORDS in lib/budget-fit.ts — that map
// points a VendorCategory at a free-text *budget category* name, this one
// points free-text *chat input* at a VendorCategory; conflating them would
// make either list's keywords wrong for the other's purpose (e.g. "band"
// is a reasonable budget-category keyword for MUSIC, but a user typing
// "band" in chat almost certainly means the vendor category, same value —
// coincidence here, not guaranteed in general).
export const VENDOR_CATEGORY_KEYWORDS: Record<VendorCategory, string[]> = {
  VENUE: ["venue", "venues"],
  CATERING: ["caterer", "caterers", "catering"],
  PHOTOGRAPHY: ["photographer", "photographers", "photography", "videographer", "videographers"],
  ATTIRE: ["attire", "dress", "dresses", "tailor", "tailors", "bridal wear", "groom's wear"],
  DECOR: ["decor", "decorator", "decorators", "florist", "florists"],
  MUSIC: ["dj", "band", "bands", "entertainment", "music"],
  MAKEUP: ["makeup", "hair", "hairstylist", "hairstylists", "makeup artist", "makeup artists"],
  TRANSPORT: ["transport", "transportation", "car hire", "car rental"],
  CAKE: ["cake", "cakes", "baker", "bakers"],
  OTHER: [],
  JEWELLERY: ["jewellery", "jewelry", "ring", "rings"],
  MC: ["mc", "emcee", "master of ceremonies"],
  PLANNER: ["planner", "planners", "coordinator", "coordinators", "wedding planner"],
};
