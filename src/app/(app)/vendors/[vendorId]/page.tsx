// src/app/(app)/vendors/[vendorId]/page.tsx
//
// Vendor detail + the negotiation panel. Two independent gates apply
// here, and it's worth keeping them straight:
//  - isProFeatured vendors hide their pricing/rating/contact from a Free
//    plan (a listing-level gate — labelled "Featured" in the UI).
//  - The negotiation/quote-tracking panel itself requires the Wedding
//    Pass regardless of whether the vendor is a featured listing (a
//    tool-level gate, enforced again server-side in
//    src/server/actions/vendors.ts — this page's check is a UX
//    convenience, not the real security boundary).

import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { requirePass, canAccessPassFeatures } from "@/lib/plan";
import { formatGHS } from "@/lib/currency";
import { getVendorImage } from "@/lib/vendor-images";
import { matchVendorBudgetCategory, getBudgetFit } from "@/lib/budget-fit";
import { guessOnboardingCategory } from "@/lib/vendor-booking-progress";
import { Card } from "@/components/ui/Card";
import { Badge, FeaturedBadge } from "@/components/ui/Badge";
import { UpgradePrompt } from "@/components/upgrade/UpgradePrompt";
import { VendorInterestPanel } from "@/components/vendors/VendorInterestPanel";
import { VendorBookingStatus } from "@/components/vendors/VendorBookingStatus";
import { categoryLabel, cityLabel } from "@/components/vendors/VendorCard";

export default async function VendorDetailPage({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  const weddingPlan = await getCurrentWeddingPlan();
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) notFound();

  const locked = vendor.isProFeatured && !canAccessPassFeatures(weddingPlan!);
  const messagingGate = requirePass(weddingPlan!, "Vendor messaging and quote tracking");

  const [interest, budgetCategories] = await Promise.all([
    prisma.vendorInterest.findUnique({
      where: { weddingPlanId_vendorId: { weddingPlanId: weddingPlan!.id, vendorId } },
    }),
    prisma.budgetCategory.findMany({ where: { weddingPlanId: weddingPlan!.id }, orderBy: { createdAt: "asc" } }),
  ]);

  // Skipped entirely for a locked (Free-viewer, featured) listing — it
  // already hides price, and a fit badge would leak a cheaper/pricier
  // signal through the lock. Same rule VendorCard.tsx/vendors/page.tsx follow.
  const matchedBudgetCategory = locked ? null : matchVendorBudgetCategory(vendor.category, budgetCategories);
  const budgetFit = matchedBudgetCategory ? getBudgetFit(vendor.priceLowGHS, matchedBudgetCategory) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <div className="relative mb-4 h-56 w-full overflow-hidden rounded-lg bg-akoma-cream">
          <Image src={getVendorImage(vendor)} alt={vendor.name} fill className="object-cover" priority />
        </div>

        <div className="mb-1 flex items-center gap-2">
          <h1 className="text-xl font-bold text-akoma-ink">{vendor.name}</h1>
          {vendor.isProFeatured && <FeaturedBadge />}
        </div>
        <p className="mb-4 text-sm text-akoma-ink/50">
          {categoryLabel(vendor.category)} · {cityLabel(vendor.city)}
        </p>

        {locked ? (
          <UpgradePrompt reason="This is a featured listing — pricing, rating and contact details unlock with the Wedding Pass." />
        ) : (
          <>
            <p className="mb-4 text-sm text-akoma-ink/70">{vendor.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="font-medium text-akoma-ink">
                {formatGHS(vendor.priceLowGHS)} – {formatGHS(vendor.priceHighGHS)}
              </span>
              <Badge tone="gold">★ {vendor.rating.toFixed(1)}</Badge>
              {vendor.contactPhone && <span className="text-akoma-ink/60">{vendor.contactPhone}</span>}
            </div>
            {budgetFit && (
              <Badge tone={budgetFit.fits ? "green" : "terracotta"} className="mt-2">
                {budgetFit.fits ? "✅" : "⚠️"} {budgetFit.label}
              </Badge>
            )}
          </>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold text-akoma-ink">Vendor Status</h2>
        <p className="mb-4 text-xs text-akoma-ink/50">Track your real progress with this vendor — however it&apos;s actually going.</p>
        <VendorBookingStatus
          weddingPlanId={weddingPlan!.id}
          vendorId={vendor.id}
          vendorName={vendor.name}
          vendorCategory={vendor.category}
          quoteAmountGHS={interest?.quoteAmountGHS ?? null}
          priceLowGHS={vendor.priceLowGHS}
          budgetCategories={budgetCategories}
          initialBookingProgress={interest?.bookingProgress ?? "NOT_CONTACTED"}
          initialOnboardingCategory={interest?.onboardingCategory ?? guessOnboardingCategory(vendor.category)}
        />
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-akoma-ink">Enquiry &amp; negotiation</h2>
        {messagingGate.allowed ? (
          <VendorInterestPanel weddingPlanId={weddingPlan!.id} vendorId={vendor.id} initialInterest={interest} />
        ) : (
          <UpgradePrompt reason={messagingGate.upgradeReason} />
        )}
      </Card>
    </div>
  );
}
