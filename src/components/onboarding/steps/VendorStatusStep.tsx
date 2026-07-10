// src/components/onboarding/steps/VendorStatusStep.tsx
//
// Feeds the Dashboard's "Vendor status" card (see dashboard/page.tsx) —
// deliberately its own small category list (ONBOARDING_VENDOR_CATEGORIES),
// not the Vendor catalog's categories, since this is a self-reported
// checklist rather than something tied to the real vendor browsing feature.

import type { StepProps } from "@/components/onboarding/onboarding-types";
import { ONBOARDING_VENDOR_CATEGORIES } from "@/lib/validation/wedding";
import { Select } from "@/components/ui/Select";

const STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "RESEARCHING", label: "Researching" },
  { value: "BOOKED", label: "Booked" },
] as const;

export function VendorStatusStep({ form, update }: StepProps) {
  function setStatus(category: string, status: string) {
    update("vendorStatus", { ...form.vendorStatus, [category]: status as (typeof form.vendorStatus)[string] });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-akoma-ink/60">Have you already booked any of these? Tell us where things stand.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {ONBOARDING_VENDOR_CATEGORIES.map((c) => (
          <div key={c.value} className="flex items-center justify-between gap-3 rounded-lg border border-akoma-ink/10 px-3 py-2">
            <span className="text-sm font-medium text-akoma-ink">{c.label}</span>
            <Select
              className="w-40"
              value={form.vendorStatus[c.value] ?? "NOT_STARTED"}
              onChange={(e) => setStatus(c.value, e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
