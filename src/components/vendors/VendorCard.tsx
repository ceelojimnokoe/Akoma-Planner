// src/components/vendors/VendorCard.tsx
//
// One vendor listing. Every vendor is browsable by everyone — but a
// vendor marked isProFeatured shows its price/rating/description only to
// Wedding Pass holders; a Free viewer sees the listing exists (name,
// category, city) with a lock instead of details, which is what "some
// listings marked Featured, visibly present but gated" means in practice.
//
// Doesn't use the shared <Card> component: Card's own padding applies
// uniformly on all sides, and fighting that with a conflicting override
// className runs into the same Tailwind class-override-order footgun
// documented in LEARNING.md #35 (the pricing badge bug) — simplest to
// just build this card's own shell, image edge-to-edge up top with its
// own overflow-hidden, a padded content area below it.

import Link from "next/link";
import Image from "next/image";
import type { Vendor } from "@prisma/client";
import { Badge, FeaturedBadge } from "@/components/ui/Badge";
import { formatGHS } from "@/lib/currency";
import { getVendorImage } from "@/lib/vendor-images";

export function VendorCard({
  vendor,
  locked,
  selectable,
  selected,
  onToggleSelect,
}: {
  vendor: Vendor;
  locked: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (vendorId: string) => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-akoma-ink/10 bg-white shadow-sm">
      <div className="relative h-44 w-full shrink-0 bg-akoma-cream">
        <Image src={getVendorImage(vendor)} alt={vendor.name} fill className="object-cover" />
        {vendor.isProFeatured && <FeaturedBadge className="absolute left-3 top-3" />}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-semibold text-akoma-ink">{vendor.name}</h3>
        <div className="mt-1 flex items-center gap-2 text-xs text-akoma-ink/50">
          <span>{categoryLabel(vendor.category)}</span>
          <span>·</span>
          <span>{cityLabel(vendor.city)}</span>
        </div>
        {!locked && (
          <div className="mt-2">
            <Badge tone="gold">★ {vendor.rating.toFixed(1)}</Badge>
          </div>
        )}

        {locked ? (
          <div className="mt-3 flex flex-1 flex-col items-start justify-center rounded-lg bg-akoma-gold/5 p-3 text-sm text-akoma-ink/60">
            <p>Pricing, rating and contact details are a featured listing.</p>
          </div>
        ) : (
          <>
            <p className="mt-3 flex-1 text-sm text-akoma-ink/70">{vendor.description}</p>
            <p className="mt-3 text-sm font-medium text-akoma-ink">
              {formatGHS(vendor.priceLowGHS)}–{formatGHS(vendor.priceHighGHS)}
            </p>
          </>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <Link href={`/vendors/${vendor.id}`} className="text-sm font-medium text-akoma-green hover:underline">
            View details →
          </Link>
          {selectable && (
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-akoma-ink/60">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect?.(vendor.id)}
                className="h-4 w-4 rounded border-akoma-ink/30 text-akoma-green focus:ring-akoma-green"
              />
              Compare
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

export function categoryLabel(category: string): string {
  return category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, " ");
}

export function cityLabel(city: string): string {
  return city.charAt(0) + city.slice(1).toLowerCase();
}
