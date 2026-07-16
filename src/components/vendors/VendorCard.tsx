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
import type { Vendor, VendorBookingProgress } from "@prisma/client";
import { Badge, FeaturedBadge } from "@/components/ui/Badge";
import { formatGHS } from "@/lib/currency";
import { getVendorImage } from "@/lib/vendor-images";
import type { BudgetFitResult } from "@/lib/budget-fit";
import { VENDOR_PROGRESS_LABEL, VENDOR_PROGRESS_TONE } from "@/lib/vendor-booking-progress";
import { VENDOR_CATEGORY_LABEL } from "@/lib/vendor-category-labels";

export function VendorCard({
  vendor,
  locked,
  selectable,
  selected,
  onToggleSelect,
  budgetFit,
  bookingProgress,
}: {
  vendor: Vendor;
  locked: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (vendorId: string) => void;
  /** Omitted entirely for a locked card — price is hidden there, and a
   *  fit badge would leak a cheaper/pricier signal through the lock.
   *  undefined also just means "no matching budget category" — see
   *  lib/budget-fit.ts's own no-match-means-no-indicator rule. */
  budgetFit?: BudgetFitResult;
  /** Only rendered beyond NOT_CONTACTED — a badge on every untouched
   *  vendor would just be noise. */
  bookingProgress?: VendorBookingProgress;
}) {
  const showProgressBadge = bookingProgress && bookingProgress !== "NOT_CONTACTED";

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-akoma-ink/10 bg-white shadow-sm">
      <Link href={`/vendors/${vendor.id}`} className="relative block h-44 w-full shrink-0 bg-akoma-cream">
        <Image
          src={getVendorImage(vendor)}
          alt={vendor.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />
        {vendor.isProFeatured && <FeaturedBadge className="absolute left-3 top-3" />}
        {showProgressBadge && (
          <Badge tone={VENDOR_PROGRESS_TONE[bookingProgress]} className="absolute right-3 top-3">
            {VENDOR_PROGRESS_LABEL[bookingProgress]}
          </Badge>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Link href={`/vendors/${vendor.id}`} className="w-fit">
          <h3 className="font-semibold text-akoma-ink hover:text-akoma-green hover:underline">{vendor.name}</h3>
        </Link>
        <div className="mt-1 flex items-center gap-2 text-xs text-akoma-ink/50">
          <span>{categoryLabel(vendor.category)}</span>
          <span>·</span>
          <span>{cityLabel(vendor.city)}</span>
        </div>
        {!locked && (
          <div className="mt-2 flex items-center gap-2">
            <Badge tone="gold">★ {vendor.rating.toFixed(1)}</Badge>
            {budgetFit && <Badge tone={budgetFit.fits ? "green" : "terracotta"}>{budgetFit.label}</Badge>}
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
  return VENDOR_CATEGORY_LABEL[category as keyof typeof VENDOR_CATEGORY_LABEL] ?? category;
}

export function cityLabel(city: string): string {
  return city.charAt(0) + city.slice(1).toLowerCase();
}
