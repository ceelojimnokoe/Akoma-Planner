// src/components/dashboard/VendorStatusCard.tsx
//
// Shows the vendor-booking checklist collected during onboarding (or
// updated from /vendors — see server/actions/vendors.ts eventually). Uses
// ONBOARDING_VENDOR_CATEGORIES for labels so this card's category names
// never drift from the onboarding step that produced the data.

import Image from "next/image";
import type { VendorBookingStatus } from "@prisma/client";
import { ONBOARDING_VENDOR_CATEGORIES } from "@/lib/validation/wedding";
import { ONBOARDING_CATEGORY_IMAGES } from "@/lib/vendor-images";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";

const STATUS_LABEL: Record<string, string> = {
  BOOKED: "Booked",
  RESEARCHING: "Researching",
  NOT_STARTED: "Not started",
};

const STATUS_TONE: Record<string, "green" | "gold" | "neutral"> = {
  BOOKED: "green",
  RESEARCHING: "gold",
  NOT_STARTED: "neutral",
};

export function VendorStatusCard({ statuses }: { statuses: VendorBookingStatus[] }) {
  const byCategory = new Map(statuses.map((s) => [s.category, s.status]));
  const bookedCount = statuses.filter((s) => s.status === "BOOKED").length;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-akoma-ink">Vendor status</h2>
          <p className="text-xs text-akoma-ink/50">{bookedCount} of {ONBOARDING_VENDOR_CATEGORIES.length} booked</p>
        </div>
        <LinkButton href="/vendors" variant="ghost" size="sm">
          Browse vendors →
        </LinkButton>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {ONBOARDING_VENDOR_CATEGORIES.map((c) => {
          const status = byCategory.get(c.value as VendorBookingStatus["category"]) ?? "NOT_STARTED";
          return (
            <li key={c.value} className="flex flex-col gap-1.5 rounded-lg border border-akoma-ink/10 px-2.5 py-1.5">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full bg-akoma-cream">
                  <Image src={ONBOARDING_CATEGORY_IMAGES[c.value]} alt="" fill className="object-cover" />
                </span>
                <span className="truncate text-xs text-akoma-ink/80" title={c.label}>{c.label}</span>
              </span>
              <Badge tone={STATUS_TONE[status]} className="self-start">
                {STATUS_LABEL[status]}
              </Badge>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
