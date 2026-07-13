// src/app/(app)/vendors/page.tsx
//
// Vendor browse/filter screen. Browsing is a free-tier feature — every
// vendor (including featured ones) is listed, but VendorCard hides
// pricing/rating/description behind a lock for featured listings on a
// Free plan. Filtering is a plain GET form (see VendorFilters).

import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { VendorFilters } from "@/components/vendors/VendorFilters";
import { VendorGrid } from "@/components/vendors/VendorGrid";
import { LinkButton } from "@/components/ui/Button";
import { PassBadge } from "@/components/ui/Badge";
import { getBudgetFit, matchVendorBudgetCategory, type BudgetFitResult } from "@/lib/budget-fit";
import type { City, VendorCategory } from "@prisma/client";

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; city?: string; featured?: string; withinBudget?: string }>;
}) {
  const { category, city, featured, withinBudget } = await searchParams;
  const weddingPlan = await getCurrentWeddingPlan();

  const [vendors, budgetCategories] = await Promise.all([
    prisma.vendor.findMany({
      where: {
        ...(category ? { category: category as VendorCategory } : {}),
        ...(city ? { city: city as City } : {}),
        // "Featured"/"Standard" here means whether the LISTING itself is
        // featured (isProFeatured) — not the viewer's own Wedding Pass
        // status, which is a separate gate (see `locked` below).
        ...(featured === "FEATURED" ? { isProFeatured: true } : featured === "STANDARD" ? { isProFeatured: false } : {}),
      },
      orderBy: [{ rating: "desc" }],
    }),
    prisma.budgetCategory.findMany({ where: { weddingPlanId: weddingPlan!.id } }),
  ]);

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

  // Locked vendors are never hidden by this filter — their fit can't be
  // computed without revealing price, so they stay visible regardless
  // (same "always visibly present" philosophy this page already applies
  // to featured listings generally).
  const visibleVendors =
    withinBudget === "1"
      ? vendors.filter((v) => (v.isProFeatured && !weddingPlan!.hasWeddingPass) || budgetFitByVendorId[v.id]?.fits)
      : vendors;

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

      <VendorFilters category={category} city={city} featured={featured} withinBudget={withinBudget} />

      {visibleVendors.length === 0 ? (
        <p className="py-12 text-center text-sm text-akoma-ink/50">No vendors match those filters.</p>
      ) : (
        <VendorGrid vendors={visibleVendors} hasWeddingPass={weddingPlan!.hasWeddingPass} budgetFitByVendorId={budgetFitByVendorId} />
      )}
    </div>
  );
}
