// src/app/(app)/vendors/page.tsx
//
// Vendor browse/filter screen. Browsing is a free-tier feature — every
// vendor (including featured ones) is listed, but VendorCard hides
// pricing/rating/description behind a lock for featured listings on a
// Free plan. Filtering is instant client-side URL updates (see
// VendorFilters, hooks/useInstantFilters.ts) that this Server Component
// re-reads via searchParams on every change — no submit button, no full
// page reload.

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { VendorFilters } from "@/components/vendors/VendorFilters";
import { VendorGrid } from "@/components/vendors/VendorGrid";
import { LinkButton } from "@/components/ui/Button";
import { PassBadge } from "@/components/ui/Badge";
import { getBudgetFit, matchVendorBudgetCategory, type BudgetFitResult } from "@/lib/budget-fit";
import type { City, VendorBookingProgress, VendorCategory } from "@prisma/client";

const PRICE_RANGES: Record<string, { lt?: number; gte?: number }> = {
  low: { lt: 5000 },
  mid: { gte: 5000, lt: 15000 },
  high: { gte: 15000 },
};

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    city?: string;
    featured?: string;
    withinBudget?: string;
    rating?: string;
    price?: string;
    status?: string;
  }>;
}) {
  const { category, city, featured, withinBudget, rating, price, status } = await searchParams;
  const weddingPlan = await getCurrentWeddingPlan();
  const priceRange = price ? PRICE_RANGES[price] : undefined;

  const [vendors, budgetCategories, interests] = await Promise.all([
    prisma.vendor.findMany({
      where: {
        ...(category ? { category: category as VendorCategory } : {}),
        ...(city ? { city: city as City } : {}),
        // "Featured"/"Standard" here means whether the LISTING itself is
        // featured (isProFeatured) — not the viewer's own Wedding Pass
        // status, which is a separate gate (see `locked` below).
        ...(featured === "FEATURED" ? { isProFeatured: true } : featured === "STANDARD" ? { isProFeatured: false } : {}),
        ...(rating ? { rating: { gte: Number(rating) } } : {}),
        ...(priceRange ? { priceLowGHS: priceRange } : {}),
      },
      orderBy: [{ rating: "desc" }],
    }),
    prisma.budgetCategory.findMany({ where: { weddingPlanId: weddingPlan!.id } }),
    prisma.vendorInterest.findMany({
      where: { weddingPlanId: weddingPlan!.id },
      select: { vendorId: true, bookingProgress: true },
    }),
  ]);

  const bookingProgressByVendorId: Record<string, VendorBookingProgress> = Object.fromEntries(
    interests.map((i) => [i.vendorId, i.bookingProgress])
  );

  // Only computed for unlocked vendors — a locked (Pro-featured, Free
  // viewer) card already hides price entirely, and a fit badge would
  // leak a cheaper/pricier signal through that lock. See lib/budget-fit.ts.
  const budgetFitByVendorId: Record<string, BudgetFitResult> = {};
  for (const vendor of vendors) {
    const locked = vendor.isProFeatured && !weddingPlan!.hasWeddingPass;
    if (locked) continue;
    const matched = matchVendorBudgetCategory(vendor.category, budgetCategories);
    if (matched) budgetFitByVendorId[vendor.id] = getBudgetFit(vendor.priceLowGHS, matched);
  }

  // Locked vendors are never hidden by the budget filter — their fit
  // can't be computed without revealing price, so they stay visible
  // regardless (same "always visibly present" philosophy this page
  // already applies to featured listings generally).
  let visibleVendors = vendors;
  if (withinBudget === "1") {
    visibleVendors = visibleVendors.filter(
      (v) => (v.isProFeatured && !weddingPlan!.hasWeddingPass) || budgetFitByVendorId[v.id]?.fits
    );
  }
  if (status) {
    visibleVendors = visibleVendors.filter((v) => (bookingProgressByVendorId[v.id] ?? "NOT_CONTACTED") === status);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-akoma-ink">Vendors</h1>
          <p className="mt-1 text-sm text-akoma-ink/60">
            {visibleVendors.length} vendor{visibleVendors.length === 1 ? "" : "s"} across Accra & Kumasi.
          </p>
        </div>
        <LinkButton href="/vendors/compare" variant="ghost" size="sm">
          Comparison view <PassBadge className="ml-2" />
        </LinkButton>
      </div>

      <Suspense fallback={<div className="h-[74px]" />}>
        <VendorFilters />
      </Suspense>

      {visibleVendors.length === 0 ? (
        <p className="py-12 text-center text-sm text-akoma-ink/50">No vendors match those filters.</p>
      ) : (
        <VendorGrid
          vendors={visibleVendors}
          hasWeddingPass={weddingPlan!.hasWeddingPass}
          budgetFitByVendorId={budgetFitByVendorId}
          bookingProgressByVendorId={bookingProgressByVendorId}
        />
      )}
    </div>
  );
}
