// src/components/dashboard/VendorStatusCard.tsx
//
// Per onboarding category: the current vendor (the most-advanced
// interest in that category, via lib/vendor-booking-progress.ts's
// pickMostAdvancedInterest) plus its real 7-value status — replacing
// the old plain 3-value BOOKED/RESEARCHING/NOT_STARTED grid, which had
// no vendor identity at all. Uses ONBOARDING_VENDOR_CATEGORIES for
// labels so this card's category names never drift from the onboarding
// step that produced the list of required categories.

import Image from "next/image";
import type { OnboardingVendorCategory, VendorBookingProgress } from "@prisma/client";
import { ONBOARDING_VENDOR_CATEGORIES } from "@/lib/validation/wedding";
import { ONBOARDING_CATEGORY_IMAGES } from "@/lib/vendor-images";
import { VENDOR_PROGRESS_LABEL, VENDOR_PROGRESS_TONE, pickMostAdvancedInterest } from "@/lib/vendor-booking-progress";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";

export interface CategoryInterest {
  vendorId: string;
  vendorName: string;
  onboardingCategory: OnboardingVendorCategory | null;
  bookingProgress: VendorBookingProgress;
  updatedAt: Date;
}

export function VendorStatusCard({ interests }: { interests: CategoryInterest[] }) {
  const byCategory = new Map<OnboardingVendorCategory, CategoryInterest[]>();
  for (const interest of interests) {
    if (!interest.onboardingCategory) continue;
    if (!byCategory.has(interest.onboardingCategory)) byCategory.set(interest.onboardingCategory, []);
    byCategory.get(interest.onboardingCategory)!.push(interest);
  }

  const bookedCount = ONBOARDING_VENDOR_CATEGORIES.filter((c) =>
    (byCategory.get(c.value as OnboardingVendorCategory) ?? []).some((i) => i.bookingProgress === "BOOKED")
  ).length;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-akoma-ink">Vendor status</h2>
          <p className="text-xs text-akoma-ink/50">
            {bookedCount} of {ONBOARDING_VENDOR_CATEGORIES.length} categories booked
          </p>
        </div>
        <LinkButton href="/vendors" variant="ghost" size="sm">
          Browse vendors →
        </LinkButton>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {ONBOARDING_VENDOR_CATEGORIES.map((c) => {
          const current = pickMostAdvancedInterest(byCategory.get(c.value as OnboardingVendorCategory) ?? []);
          const progress = current?.bookingProgress ?? "NOT_CONTACTED";
          return (
            <li key={c.value} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-akoma-ink/10 px-2.5 py-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-akoma-cream">
                  <Image src={ONBOARDING_CATEGORY_IMAGES[c.value]} alt="" fill sizes="24px" className="object-cover" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs text-akoma-ink/80" title={c.label}>
                    {c.label}
                  </p>
                  {current && (
                    <p className="truncate text-xs text-akoma-ink/50" title={current.vendorName}>
                      {current.vendorName}
                    </p>
                  )}
                </div>
              </div>
              <Badge tone={VENDOR_PROGRESS_TONE[progress]} className="shrink-0">
                {VENDOR_PROGRESS_LABEL[progress]}
              </Badge>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
