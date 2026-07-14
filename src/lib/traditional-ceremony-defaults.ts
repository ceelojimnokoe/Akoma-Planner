// src/lib/traditional-ceremony-defaults.ts
//
// Pure transform from TraditionalListItem's global catalog rows (see
// schema.prisma — no weddingPlanId, no acquired/spent concept) into the
// per-couple TraditionalCeremonyItem rows a new wedding plan is seeded
// with. Kept pure (catalog rows passed in, no Prisma import here) so it's
// unit-testable without a database — the actual query lives in
// server/actions/wedding.ts's createWeddingPlan, same split as
// checklist-defaults.ts/budget-defaults.ts.

import type { City } from "@prisma/client";

// Shared by lib/budget-defaults.ts (creates the default row), budget/page.tsx
// and traditional-ceremony/page.tsx (find it by name), and
// server/actions/traditional-ceremony.ts (re-derives its spentGHS). One
// constant, not four independently hand-typed copies — a "use server"
// file can only export async functions, so this can't live there.
export const TRADITIONAL_CUSTOMARY_BUDGET_NAME = "Traditional Customary";

export interface TraditionalListItemLike {
  category: string;
  itemName: string;
  estLowGHS: number;
  estHighGHS: number;
}

export interface BuiltTraditionalCeremonyItem {
  name: string;
  category: string;
  allocatedGHS: number;
  spentGHS: 0;
  done: false;
  isDefault: true;
}

/** TraditionalListItem's catalog only has ACCRA/KUMASI rows — a couple who
 *  picked "Other" at onboarding still needs real starting defaults for
 *  this Pass-gated, paid feature, so this falls back to ACCRA rather than
 *  leaving them with a permanently empty page. */
export function resolveTraditionalCeremonyCatalogCity(city: City): "ACCRA" | "KUMASI" {
  return city === "OTHER" ? "ACCRA" : city;
}

/** allocatedGHS defaults to the catalog's own estimate-range midpoint —
 *  unlike Budget categories' zero-fill philosophy, these are real known
 *  per-item market prices, not an arbitrary top-down guess, so a sensible
 *  starting number is more helpful than a blank one here. */
export function buildDefaultTraditionalCeremonyItems(catalogItems: TraditionalListItemLike[]): BuiltTraditionalCeremonyItem[] {
  return catalogItems.map((item) => ({
    name: item.itemName,
    category: item.category,
    allocatedGHS: Math.round((item.estLowGHS + item.estHighGHS) / 2),
    spentGHS: 0,
    done: false,
    isDefault: true,
  }));
}
