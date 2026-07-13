// src/app/(app)/accommodation/[accommodationId]/page.tsx
//
// Accommodation detail page — didn't exist before (the whole listing was
// crammed into the browse card). Mirrors vendors/[vendorId]/page.tsx's
// shape (image, name, price, rating, description, contact) minus that
// page's Free/Pass lock and negotiation panel, since neither applies
// here — Accommodation is a free-tier, no-negotiation-tool feature.

import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { formatGHS } from "@/lib/currency";
import { getAccommodationImage } from "@/lib/accommodation-images";
import { cityLabel } from "@/components/vendors/VendorCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getBudgetFit, matchBudgetCategoryByName } from "@/lib/budget-fit";

export default async function AccommodationDetailPage({
  params,
}: {
  params: Promise<{ accommodationId: string }>;
}) {
  const { accommodationId } = await params;
  const weddingPlan = await getCurrentWeddingPlan();
  const accommodation = await prisma.accommodation.findUnique({
    where: { id: accommodationId },
    include: { nearVendor: true },
  });
  if (!accommodation) notFound();

  const budgetCategories = await prisma.budgetCategory.findMany({ where: { weddingPlanId: weddingPlan!.id } });
  const matchedCategory = matchBudgetCategoryByName("Accommodation", budgetCategories);
  const budgetFit = matchedCategory ? getBudgetFit(accommodation.priceLowGHS, matchedCategory) : null;

  const amenities = accommodation.amenities
    ? accommodation.amenities.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <div className="relative mb-4 h-56 w-full overflow-hidden rounded-lg bg-akoma-cream">
          <Image src={getAccommodationImage(accommodation)} alt={accommodation.name} fill className="object-cover" priority />
        </div>

        <div className="mb-1 flex items-center gap-2">
          <h1 className="text-xl font-bold text-akoma-ink">{accommodation.name}</h1>
          <Badge tone="gold">★ {accommodation.rating.toFixed(1)}</Badge>
        </div>
        <p className="mb-4 text-sm text-akoma-ink/50">
          {cityLabel(accommodation.city)} · {accommodation.distanceFromVenueKm.toFixed(1)} km from{" "}
          {accommodation.nearVendor?.name ?? "the venue"}
        </p>

        {budgetFit && (
          <div className="mb-4">
            <Badge tone={budgetFit.fits ? "green" : "terracotta"}>{budgetFit.label}</Badge>
          </div>
        )}

        {accommodation.description && <p className="mb-4 text-sm text-akoma-ink/70">{accommodation.description}</p>}

        {amenities.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {amenities.map((amenity) => (
              <span key={amenity} className="rounded-full bg-akoma-cream px-2.5 py-1 text-xs text-akoma-ink/70">
                {amenity}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium text-akoma-ink">
            {formatGHS(accommodation.priceLowGHS)} – {formatGHS(accommodation.priceHighGHS)}{" "}
            <span className="font-normal text-akoma-ink/50">/ night</span>
          </span>
          {accommodation.contactPhone && <span className="text-akoma-ink/60">{accommodation.contactPhone}</span>}
        </div>
      </Card>
    </div>
  );
}
