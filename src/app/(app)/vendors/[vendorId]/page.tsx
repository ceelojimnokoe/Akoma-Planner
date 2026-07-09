// src/app/(app)/vendors/[vendorId]/page.tsx
//
// Vendor detail + the negotiation panel. Two independent gates apply
// here, and it's worth keeping them straight:
//  - isProFeatured vendors hide their pricing/rating/contact from a Free
//    plan (a listing-level gate).
//  - The negotiation/quote-tracking panel itself is Pro-only regardless
//    of whether the vendor is Pro-featured (a tool-level gate, enforced
//    again server-side in src/server/actions/vendors.ts — this page's
//    check is a UX convenience, not the real security boundary).

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { requirePro } from "@/lib/plan";
import { formatGHS } from "@/lib/currency";
import { Card } from "@/components/ui/Card";
import { Badge, ProBadge } from "@/components/ui/Badge";
import { UpgradePrompt } from "@/components/pro/UpgradePrompt";
import { VendorInterestPanel } from "@/components/vendors/VendorInterestPanel";
import { categoryLabel, cityLabel } from "@/components/vendors/VendorCard";

export default async function VendorDetailPage({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  const weddingPlan = await getCurrentWeddingPlan();
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) notFound();

  const locked = vendor.isProFeatured && weddingPlan!.plan === "FREE";
  const messagingGate = requirePro(weddingPlan!.plan, "Vendor messaging and quote tracking");

  const interest = await prisma.vendorInterest.findUnique({
    where: { weddingPlanId_vendorId: { weddingPlanId: weddingPlan!.id, vendorId } },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <div className="mb-1 flex items-center gap-2">
          <h1 className="text-xl font-bold text-akoma-ink">{vendor.name}</h1>
          {vendor.isProFeatured && <ProBadge />}
        </div>
        <p className="mb-4 text-sm text-akoma-ink/50">
          {categoryLabel(vendor.category)} · {cityLabel(vendor.city)}
        </p>

        {locked ? (
          <UpgradePrompt reason="This is a Pro-featured listing — pricing, rating and contact details unlock on Pro." />
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
          </>
        )}
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
