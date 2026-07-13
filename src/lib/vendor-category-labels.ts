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
