// src/app/(app)/accommodation/page.tsx
//
// Accommodation finder: lodging for out-of-town family, sorted by
// distance from the venue (nearVendorId links each listing back to a
// seeded venue — see prisma/schema.prisma). Free for every plan — Pass
// widening this to more results/filters is a real idea but deliberately
// deferred, not built yet (see LEARNING.md); don't invent a fake
// free/Pass split here just because most other tools have one.
//
// Accommodation is global reference data with no per-wedding "side"
// assignment field, so "by side" is handled as a workflow — the couple
// filters/sorts this same shared list and decides what to share with
// each side — rather than a persisted per-listing tag.
//
// Cards (AccommodationCard.tsx) follow the same "image on top, info
// below, clickable image/title + a budget-fit badge" shell as
// VendorCard.tsx for consistency across the two listing surfaces — same
// "Within my budget" filter too, matched against a BudgetCategory
// literally named "Accommodation" (see lib/budget-fit.ts). No
// isProFeatured-style lock exists here, so there's no equivalent
// price-leak risk to guard against the way vendors' filter does.
//
// Filtering is instant client-side URL updates (see AccommodationFilters,
// hooks/useInstantFilters.ts) that this Server Component re-reads via
// searchParams on every change — no submit button, no full page reload.

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { AccommodationCard } from "@/components/accommodation/AccommodationCard";
import { AccommodationFilters } from "@/components/accommodation/AccommodationFilters";
import { getBudgetFit, matchBudgetCategoryByName, type BudgetFitResult } from "@/lib/budget-fit";
import type { City } from "@prisma/client";

// Sized from the real seed data range (GH₵350–2,200/night) — a different
// scale from vendors/page.tsx's own PRICE_RANGES (up-front totals in the
// thousands), so this is a separate map rather than a shared one.
const ACCOMMODATION_PRICE_RANGES: Record<string, { lt?: number; gte?: number }> = {
  low: { lt: 600 },
  mid: { gte: 600, lt: 1200 },
  high: { gte: 1200 },
};

export default async function AccommodationPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; withinBudget?: string; price?: string; rating?: string }>;
}) {
  const { city: cityParam, withinBudget, price, rating } = await searchParams;
  const weddingPlan = await getCurrentWeddingPlan();
  const city = (cityParam as City) ?? weddingPlan!.city;
  const priceRange = price ? ACCOMMODATION_PRICE_RANGES[price] : undefined;

  const [accommodations, budgetCategories] = await Promise.all([
    prisma.accommodation.findMany({
      where: {
        city,
        ...(priceRange ? { priceLowGHS: priceRange } : {}),
        ...(rating ? { rating: { gte: Number(rating) } } : {}),
      },
      include: { nearVendor: true },
      orderBy: { distanceFromVenueKm: "asc" },
    }),
    prisma.budgetCategory.findMany({ where: { weddingPlanId: weddingPlan!.id } }),
  ]);

  const matchedCategory = matchBudgetCategoryByName("Accommodation", budgetCategories);
  const budgetFitById: Record<string, BudgetFitResult> = {};
  if (matchedCategory) {
    for (const a of accommodations) {
      budgetFitById[a.id] = getBudgetFit(a.priceLowGHS, matchedCategory);
    }
  }

  const visibleAccommodations = withinBudget === "1" ? accommodations.filter((a) => budgetFitById[a.id]?.fits) : accommodations;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-akoma-ink">Accommodation</h1>
        <p className="mt-1 text-sm text-akoma-ink/60">
          Lodging for out-of-town family, closest to the venue first. Share different options with each side
          depending on budget and who&apos;s traveling.
        </p>
      </div>

      <Suspense fallback={<div className="h-[74px]" />}>
        <AccommodationFilters defaultCity={weddingPlan!.city} />
      </Suspense>

      {!matchedCategory && withinBudget === "1" && (
        <p className="rounded-lg bg-akoma-ink/5 px-3 py-2 text-xs text-akoma-ink/50">
          Add an &quot;Accommodation&quot; category on the Budget page to compare listings against it.
        </p>
      )}

      {visibleAccommodations.length === 0 ? (
        <p className="py-8 text-center text-sm text-akoma-ink/50">No accommodation listings match those filters.</p>
      ) : (
        // sm:pr-20: keeps the rightmost card in each row clear of the
        // floating chat bubble (fixed to the viewport corner) — see the
        // matching comment on dashboard's "Budget by category" card.
        <div className="grid gap-6 pr-0 sm:grid-cols-2 sm:pr-20 lg:grid-cols-3">
          {visibleAccommodations.map((a) => (
            <AccommodationCard key={a.id} accommodation={a} budgetFit={budgetFitById[a.id]} />
          ))}
        </div>
      )}
    </div>
  );
}
