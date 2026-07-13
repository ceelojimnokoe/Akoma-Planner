// src/components/vendors/SaveBookingToBudgetDialog.tsx
//
// Offered right after a successful booking confirmation. Reuses
// matchVendorBudgetCategory (lib/budget-fit.ts) unchanged — that file
// has no Prisma import, so it's safe to call directly from a client
// component — and the existing updateBudgetCategory action
// (server/actions/budget.ts); no new budget action needed.

"use client";

import { useState, useTransition } from "react";
import type { BudgetCategory, VendorCategory } from "@prisma/client";
import { matchVendorBudgetCategory } from "@/lib/budget-fit";
import { updateBudgetCategory } from "@/server/actions/budget";
import { formatGHS } from "@/lib/currency";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function SaveBookingToBudgetDialog({
  open,
  vendorCategory,
  budgetCategories,
  quoteAmountGHS,
  priceLowGHS,
  onClose,
}: {
  open: boolean;
  vendorCategory: VendorCategory;
  budgetCategories: BudgetCategory[];
  quoteAmountGHS: number | null;
  priceLowGHS: number;
  onClose: () => void;
}) {
  const matched = matchVendorBudgetCategory(vendorCategory, budgetCategories);
  const [amount, setAmount] = useState(String(quoteAmountGHS ?? priceLowGHS));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleClose() {
    setSaved(false);
    onClose();
  }

  if (!matched) {
    return (
      <Modal open={open} onClose={handleClose} title="Save to Budget">
        <p className="text-sm text-akoma-ink/70">
          No budget category matches this vendor yet — add one on the Budget page to track this spend.
        </p>
        <div className="mt-6 flex justify-end">
          <Button size="sm" variant="ghost" onClick={handleClose}>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  if (saved) {
    return (
      <Modal open={open} onClose={handleClose} title="Saved to Budget">
        <p className="text-sm text-akoma-green">Saved to your {matched.name} budget.</p>
        <div className="mt-6 flex justify-end">
          <Button size="sm" onClick={handleClose}>
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  const parsedAmount = Number(amount) || 0;
  const remainingAfter = matched.allocatedGHS - parsedAmount;
  const hasExistingSpend = matched.spentGHS > 0;

  function handleSave() {
    startTransition(async () => {
      await updateBudgetCategory({ id: matched!.id, spentGHS: parsedAmount });
      setSaved(true);
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Save booking to budget?">
      <p className="text-sm text-akoma-ink/70">Would you like to save this booking to your Budget?</p>
      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-akoma-ink/60">Quoted price</span>
          <span className="text-akoma-ink">{quoteAmountGHS != null ? formatGHS(quoteAmountGHS) : "Not recorded"}</span>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-akoma-ink/70">Amount to record</span>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-xs text-akoma-ink/40">GH₵</span>
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-32 rounded-md border border-akoma-ink/15 px-2 py-1 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
            />
          </div>
        </label>
        <div className="flex items-center justify-between">
          <span className="text-akoma-ink/60">Budget category</span>
          <span className="font-medium text-akoma-ink">{matched.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-akoma-ink/60">Allocated budget</span>
          <span className="text-akoma-ink">{formatGHS(matched.allocatedGHS)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-akoma-ink/60">Remaining after booking</span>
          <span className={`font-medium ${remainingAfter < 0 ? "text-akoma-terracotta" : "text-akoma-green"}`}>
            {formatGHS(remainingAfter)}
          </span>
        </div>
        {hasExistingSpend && (
          <p className="rounded-lg bg-akoma-gold/10 px-3 py-2 text-xs text-akoma-ink/70">
            This category already has {formatGHS(matched.spentGHS)} recorded — saving will replace it with the amount
            above.
          </p>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" size="sm" disabled={isPending} onClick={handleClose}>
          Cancel
        </Button>
        <Button size="sm" disabled={isPending} onClick={handleSave}>
          {isPending ? "Saving…" : "Save Booking"}
        </Button>
      </div>
    </Modal>
  );
}
