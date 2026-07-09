// src/components/vendors/VendorCard.tsx
//
// One vendor listing. Every vendor is browsable by everyone — but a
// vendor marked isProFeatured shows its price/rating/description only to
// Pro plans; a Free viewer sees the listing exists (name, category, city)
// with a lock instead of details, which is what "some listings marked
// Pro-only, visibly present but gated" means in practice.

import Link from "next/link";
import type { Vendor } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Badge, ProBadge } from "@/components/ui/Badge";
import { formatGHS } from "@/lib/currency";

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
    <Card className="relative flex flex-col">
      {selectable && (
        <label className="absolute right-4 top-4 flex items-center gap-1.5 text-xs text-akoma-ink/60">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(vendor.id)}
            className="h-4 w-4 rounded border-akoma-ink/30 text-akoma-green focus:ring-akoma-green"
          />
          Compare
        </label>
      )}

      <div className="mb-1 flex items-center gap-2">
        <h3 className="font-semibold text-akoma-ink">{vendor.name}</h3>
        {vendor.isProFeatured && <ProBadge />}
      </div>
      <div className="mb-3 flex items-center gap-2 text-xs text-akoma-ink/50">
        <span>{categoryLabel(vendor.category)}</span>
        <span>·</span>
        <span>{cityLabel(vendor.city)}</span>
      </div>

      {locked ? (
        <div className="flex flex-1 flex-col items-start justify-center rounded-lg bg-akoma-gold/5 p-3 text-sm text-akoma-ink/60">
          <p>Pricing, rating and contact details are a Pro-featured listing.</p>
        </div>
      ) : (
        <>
          <p className="mb-3 flex-1 text-sm text-akoma-ink/70">{vendor.description}</p>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-medium text-akoma-ink">
              {formatGHS(vendor.priceLowGHS)}–{formatGHS(vendor.priceHighGHS)}
            </span>
            <Badge tone="gold">★ {vendor.rating.toFixed(1)}</Badge>
          </div>
        </>
      )}

      <Link
        href={`/vendors/${vendor.id}`}
        className="mt-auto text-sm font-medium text-akoma-green hover:underline"
      >
        View details →
      </Link>
    </Card>
  );
}

export function categoryLabel(category: string): string {
  return category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, " ");
}

export function cityLabel(city: string): string {
  return city.charAt(0) + city.slice(1).toLowerCase();
}
