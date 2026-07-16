// src/components/accommodation/AccommodationCard.tsx
//
// Extracted from what used to be inline markup directly in
// accommodation/page.tsx — same "image on top, info below" shell as
// VendorCard.tsx for visual consistency across the two listing surfaces,
// now also matching VendorCard's clickability: the image and the title
// both link to the detail page, alongside an explicit "View details"
// link (none of the three existed before this card became clickable at
// all).

import Link from "next/link";
import Image from "next/image";
import type { Accommodation, Vendor } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";
import { formatGHS } from "@/lib/currency";
import { getAccommodationImage } from "@/lib/accommodation-images";
import type { BudgetFitResult } from "@/lib/budget-fit";

export function AccommodationCard({
  accommodation,
  budgetFit,
}: {
  accommodation: Accommodation & { nearVendor: Vendor | null };
  /** undefined means "no matching Accommodation budget category" — see
   *  lib/budget-fit.ts's own no-match-means-no-indicator rule. */
  budgetFit?: BudgetFitResult;
}) {
  const amenities = accommodation.amenities
    ? accommodation.amenities.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-akoma-ink/10 bg-white shadow-sm">
      <Link href={`/accommodation/${accommodation.id}`} className="relative block h-44 w-full shrink-0 bg-akoma-cream">
        <Image
          src={getAccommodationImage(accommodation)}
          alt={accommodation.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/accommodation/${accommodation.id}`} className="w-fit">
            <h3 className="font-semibold text-akoma-ink hover:text-akoma-green hover:underline">{accommodation.name}</h3>
          </Link>
          <Badge tone="gold" className="shrink-0">★ {accommodation.rating.toFixed(1)}</Badge>
        </div>
        <p className="mt-1 text-xs text-akoma-ink/50">
          {accommodation.distanceFromVenueKm.toFixed(1)} km from {accommodation.nearVendor?.name ?? "the venue"}
        </p>
        {budgetFit && (
          <div className="mt-2">
            <Badge tone={budgetFit.fits ? "green" : "terracotta"}>{budgetFit.label}</Badge>
          </div>
        )}
        {accommodation.description && <p className="mt-3 flex-1 text-sm text-akoma-ink/70">{accommodation.description}</p>}
        {amenities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {amenities.map((amenity) => (
              <span key={amenity} className="rounded-full bg-akoma-cream px-2.5 py-1 text-xs text-akoma-ink/70">
                {amenity}
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-akoma-ink">
            {formatGHS(accommodation.priceLowGHS)}–{formatGHS(accommodation.priceHighGHS)}{" "}
            <span className="font-normal text-akoma-ink/50">/ night</span>
          </p>
          <Link href={`/accommodation/${accommodation.id}`} className="text-sm font-medium text-akoma-green hover:underline">
            View details →
          </Link>
        </div>
      </div>
    </div>
  );
}
