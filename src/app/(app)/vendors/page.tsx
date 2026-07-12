// src/app/(app)/vendors/page.tsx
//
// Vendor browse/filter screen. Browsing is a free-tier feature — every
// vendor (including Pro-featured ones) is listed, but VendorCard hides
// pricing/rating/description behind a lock for Pro-featured listings on
// a Free plan. Filtering is a plain GET form (see VendorFilters).

import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { VendorFilters } from "@/components/vendors/VendorFilters";
import { VendorGrid } from "@/components/vendors/VendorGrid";
import { LinkButton } from "@/components/ui/Button";
import { ProBadge } from "@/components/ui/Badge";
import type { City, VendorCategory } from "@prisma/client";

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; city?: string; featured?: string }>;
}) {
  const { category, city, featured } = await searchParams;
  const weddingPlan = await getCurrentWeddingPlan();

  const vendors = await prisma.vendor.findMany({
    where: {
      ...(category ? { category: category as VendorCategory } : {}),
      ...(city ? { city: city as City } : {}),
      // "Featured"/"Standard" here means whether the LISTING itself is
      // Pro-featured (isProFeatured) — not the viewer's own Wedding Pass
      // status, which is a separate gate (see `locked` below).
      ...(featured === "FEATURED" ? { isProFeatured: true } : featured === "STANDARD" ? { isProFeatured: false } : {}),
    },
    orderBy: [{ rating: "desc" }],
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-akoma-ink">Vendors</h1>
          <p className="mt-1 text-sm text-akoma-ink/60">
            {vendors.length} vendor{vendors.length === 1 ? "" : "s"} across Accra & Kumasi.
          </p>
        </div>
        <LinkButton href="/vendors/compare" variant="ghost" size="sm">
          Comparison view <ProBadge className="ml-2" />
        </LinkButton>
      </div>

      <VendorFilters category={category} city={city} featured={featured} />

      {vendors.length === 0 ? (
        <p className="py-12 text-center text-sm text-akoma-ink/50">No vendors match those filters.</p>
      ) : (
        <VendorGrid vendors={vendors} hasWeddingPass={weddingPlan!.hasWeddingPass} />
      )}
    </div>
  );
}
