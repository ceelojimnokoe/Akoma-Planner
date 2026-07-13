// src/components/vendors/VendorProgressTimeline.tsx
//
// A simple visual read of "where am I in the booking journey" on the
// Vendor Detail page. Renders as current position on an ordered scale
// (✓ for every rank at or below the current one, ○ above it) — not an
// implied step-by-step history, since only current state is stored (no
// event log). A couple who jumped straight from Not Contacted to
// Negotiating (met at a wedding fair, no in-app enquiry) shouldn't see a
// timeline that implies they passed through Shortlisted/Enquiry Sent
// first.

import type { VendorBookingProgress } from "@prisma/client";
import { PROGRESS_RANK, VENDOR_PROGRESS_FORWARD_ORDER, VENDOR_PROGRESS_LABEL } from "@/lib/vendor-booking-progress";
import clsx from "clsx";

// Strip the leading emoji from a label — the ✓/○ marker already carries
// that signal in this component specifically.
function plainLabel(status: VendorBookingProgress) {
  return VENDOR_PROGRESS_LABEL[status].replace(/^\S+\s/, "");
}

export function VendorProgressTimeline({ currentStatus }: { currentStatus: VendorBookingProgress }) {
  if (currentStatus === "NOT_SELECTED") {
    return (
      <p className="text-sm text-akoma-terracotta">
        {VENDOR_PROGRESS_LABEL.NOT_SELECTED} — this vendor is no longer being considered.
      </p>
    );
  }

  const currentRank = PROGRESS_RANK[currentStatus];
  const steps = VENDOR_PROGRESS_FORWARD_ORDER.filter((s) => s !== "NOT_CONTACTED");

  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
      {steps.map((status, i) => {
        const reached = PROGRESS_RANK[status] <= currentRank;
        return (
          <li key={status} className="flex items-center gap-1.5">
            <span className={clsx("flex items-center gap-1", reached ? "font-medium text-akoma-green" : "text-akoma-ink/40")}>
              <span aria-hidden>{reached ? "✓" : "○"}</span>
              {plainLabel(status)}
            </span>
            {i < steps.length - 1 && <span className="text-akoma-ink/20">—</span>}
          </li>
        );
      })}
    </ol>
  );
}
