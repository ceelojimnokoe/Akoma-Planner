// src/components/vendors/BookingConfirmationDialog.tsx
//
// The one confirm step before a vendor becomes Booked — reuses Modal.tsx
// (the app's only modal primitive) rather than the native confirm() this
// codebase used everywhere else for "are you sure" actions; a plain
// confirm() can't show the category/consequence detail this moment
// calls for.

"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function BookingConfirmationDialog({
  open,
  vendorName,
  categoryLabel,
  isPending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  vendorName: string;
  categoryLabel: string | null;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title="Confirm booking">
      <p className="text-sm text-akoma-ink/70">You are about to mark:</p>
      <p className="my-2 text-lg font-semibold text-akoma-ink">{vendorName}</p>
      <p className="text-sm text-akoma-ink/70">
        {categoryLabel ? (
          <>
            as your booked <span className="font-medium text-akoma-ink">{categoryLabel}</span> vendor.
          </>
        ) : (
          "as booked."
        )}
      </p>
      <p className="mb-1.5 mt-4 text-xs font-medium uppercase tracking-wide text-akoma-ink/40">Once confirmed</p>
      <ul className="space-y-1 text-sm text-akoma-ink/60">
        <li>• This vendor becomes your official{categoryLabel ? ` ${categoryLabel}` : ""} vendor.</li>
        <li>• Checklist progress will update.</li>
        <li>• Vendor progress updates.</li>
        <li>• Wedding Health Score updates.</li>
      </ul>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" size="sm" disabled={isPending} onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" disabled={isPending} onClick={onConfirm}>
          {isPending ? "Confirming…" : "Confirm Booking"}
        </Button>
      </div>
    </Modal>
  );
}
