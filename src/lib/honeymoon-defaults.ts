// src/lib/honeymoon-defaults.ts
//
// The Honeymoon Planner's fixed default checklist — seeded once at
// createWeddingPlan time, same eager-seeding convention as
// checklist-defaults.ts/traditional-ceremony-defaults.ts. No DB lookup
// needed (unlike Traditional Ceremony's catalog-derived defaults), since
// this list is the same for every wedding.

export const DEFAULT_HONEYMOON_CHECKLIST_TITLES: string[] = [
  "Decide destination",
  "Set honeymoon budget",
  "Book accommodation",
  "Arrange transport/flights",
  "Prepare travel documents",
  "Plan activities",
  "Pack essentials",
];

export interface BuiltHoneymoonChecklistItem {
  title: string;
  done: false;
  isDefault: true;
}

export function buildDefaultHoneymoonChecklist(): BuiltHoneymoonChecklistItem[] {
  return DEFAULT_HONEYMOON_CHECKLIST_TITLES.map((title) => ({ title, done: false, isDefault: true }));
}

export const HONEYMOON_DESTINATION_PRESETS = ["Ada", "Cape Coast", "Aburi", "Kumasi", "Volta Region"] as const;

export const HONEYMOON_STYLES = ["Relaxation", "Adventure", "Luxury", "Budget Friendly", "Cultural Experience"] as const;
