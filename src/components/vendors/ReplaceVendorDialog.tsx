// src/components/vendors/ReplaceVendorDialog.tsx
//
// Shown when setVendorBookingProgress (server/actions/vendor-booking.ts)
// returns a `conflict` — only one vendor may be Booked per category at a
// time. Replacing runs the demote-old/promote-new pair as one
// transaction server-side; this dialog is just the human decision point.

"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function ReplaceVendorDialog({
  open,
  existingVendorName,
  newVendorName,
  isPending,
  onKeepCurrent,
  onReplace,
}: {
  open: boolean;
  existingVendorName: string;
  newVendorName: string;
  isPending?: boolean;
  onKeepCurrent: () => void;
  onReplace: () => void;
}) {
  return (
    <Modal open={open} onClose={onKeepCurrent} title="Replace booked vendor?">
      <p className="text-sm text-akoma-ink/70">You have already booked:</p>
      <p className="my-2 text-lg font-semibold text-akoma-ink">{existingVendorName}</p>
      <p className="text-sm text-akoma-ink/70">
        Would you like to replace your booked vendor with <span className="font-medium text-akoma-ink">{newVendorName}</span>?
      </p>
      <p className="mt-3 text-xs text-akoma-ink/50">
        {existingVendorName} will move to Not Selected, and {newVendorName} becomes Booked — this happens automatically.
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" size="sm" disabled={isPending} onClick={onKeepCurrent}>
          Keep Current
        </Button>
        <Button size="sm" disabled={isPending} onClick={onReplace}>
          {isPending ? "Replacing…" : "Replace Vendor"}
        </Button>
      </div>
    </Modal>
  );
}
