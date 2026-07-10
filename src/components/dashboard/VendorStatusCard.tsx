// src/components/dashboard/VendorStatusCard.tsx
//
// Shows the vendor-booking checklist collected during onboarding (or
// updated from /vendors — see server/actions/vendors.ts eventually). Uses
// ONBOARDING_VENDOR_CATEGORIES for labels so this card's category names
// never drift from the onboarding step that produced the data.

import Link from "next/link";
import type { VendorBookingStatus } from "@prisma/client";
import { ONBOARDING_VENDOR_CATEGORIES } from "@/lib/validation/wedding";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

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
        <Link href="/vendors" className="text-sm text-akoma-green hover:underline">
          Browse vendors →
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ONBOARDING_VENDOR_CATEGORIES.map((c) => {
          const status = byCategory.get(c.value as VendorBookingStatus["category"]) ?? "NOT_STARTED";
          return (
            <li key={c.value} className="flex items-center justify-between gap-2 rounded-lg border border-akoma-ink/10 px-2.5 py-1.5">
              <span className="truncate text-xs text-akoma-ink/80">{c.label}</span>
              <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
