// src/components/vendors/VendorBookingStatus.tsx
//
// The Vendor Detail page's central "where am I with this vendor" panel
// — a segmented control across the 7 statuses, the editable onboarding-
// category dropdown, and the progress timeline. Deliberately NOT
// Pass-gated (see server/actions/vendor-booking.ts's header comment) —
// this renders for every account tier. Every status change except
// Booked applies immediately via useTransition, optimistic like
// ChecklistItemRow.tsx's pattern; Booked routes through the
// confirmation dialog (and, on a category conflict, the replace
// dialog) since that transition has real consequences elsewhere in the
// app (checklist, budget, health score).

"use client";

import { useState, useTransition } from "react";
import type { BudgetCategory, OnboardingVendorCategory, VendorBookingProgress, VendorCategory } from "@prisma/client";
import { setVendorBookingProgress } from "@/server/actions/vendor-booking";
import { VENDOR_PROGRESS_FORWARD_ORDER, VENDOR_PROGRESS_LABEL } from "@/lib/vendor-booking-progress";
import { ONBOARDING_VENDOR_CATEGORIES } from "@/lib/validation/wedding";
import { VendorProgressTimeline } from "@/components/vendors/VendorProgressTimeline";
import { BookingConfirmationDialog } from "@/components/vendors/BookingConfirmationDialog";
import { ReplaceVendorDialog } from "@/components/vendors/ReplaceVendorDialog";
import { SaveBookingToBudgetDialog } from "@/components/vendors/SaveBookingToBudgetDialog";
import clsx from "clsx";

export function VendorBookingStatus({
  weddingPlanId,
  vendorId,
  vendorName,
  vendorCategory,
  quoteAmountGHS,
  priceLowGHS,
  budgetCategories,
  initialBookingProgress,
  initialOnboardingCategory,
}: {
  weddingPlanId: string;
  vendorId: string;
  vendorName: string;
  vendorCategory: VendorCategory;
  quoteAmountGHS: number | null;
  priceLowGHS: number;
  budgetCategories: BudgetCategory[];
  initialBookingProgress: VendorBookingProgress;
  initialOnboardingCategory: OnboardingVendorCategory | null;
}) {
  const [progress, setProgress] = useState(initialBookingProgress);
  const [category, setCategory] = useState<OnboardingVendorCategory | null>(initialOnboardingCategory);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [confirmingBooking, setConfirmingBooking] = useState(false);
  const [conflict, setConflict] = useState<{ vendorId: string; vendorName: string } | null>(null);
  const [showSaveToBudget, setShowSaveToBudget] = useState(false);

  const categoryLabel = category ? (ONBOARDING_VENDOR_CATEGORIES.find((c) => c.value === category)?.label ?? category) : null;

  function applyDirect(next: VendorBookingProgress) {
    const previous = progress;
    setProgress(next); // optimistic
    setError(null);
    startTransition(async () => {
      const result = await setVendorBookingProgress(weddingPlanId, vendorId, next, { onboardingCategory: category });
      if (!result.ok) {
        setProgress(previous);
        setError(result.error ?? "Couldn't update status.");
      }
    });
  }

  function handleStatusClick(status: VendorBookingProgress) {
    if (status === progress || isPending) return;
    if (status === "BOOKED") {
      setConfirmingBooking(true);
      return;
    }
    applyDirect(status);
  }

  function handleCategoryChange(next: OnboardingVendorCategory | null) {
    setCategory(next);
    startTransition(async () => {
      await setVendorBookingProgress(weddingPlanId, vendorId, progress, { onboardingCategory: next });
    });
  }

  function handleConfirmBooking() {
    setError(null);
    startTransition(async () => {
      const result = await setVendorBookingProgress(weddingPlanId, vendorId, "BOOKED", { onboardingCategory: category });
      setConfirmingBooking(false);
      if (result.conflict) {
        setConflict(result.conflict);
        return;
      }
      if (!result.ok) {
        setError(result.error ?? "Couldn't confirm the booking.");
        return;
      }
      setProgress("BOOKED");
      setShowSaveToBudget(true);
    });
  }

  function handleReplaceConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await setVendorBookingProgress(weddingPlanId, vendorId, "BOOKED", {
        onboardingCategory: category,
        confirmReplace: true,
      });
      setConflict(null);
      if (!result.ok) {
        setError(result.error ?? "Couldn't replace the booked vendor.");
        return;
      }
      setProgress("BOOKED");
      setShowSaveToBudget(true);
    });
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-akoma-terracotta/10 px-3 py-2 text-sm text-akoma-terracotta">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {VENDOR_PROGRESS_FORWARD_ORDER.map((status) => (
          <button
            key={status}
            type="button"
            disabled={isPending}
            onClick={() => handleStatusClick(status)}
            className={clsx(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed",
              status === progress
                ? "border-akoma-green bg-akoma-green/10 text-akoma-green ring-1 ring-akoma-green"
                : "border-akoma-ink/15 text-akoma-ink/60 hover:border-akoma-green/50"
            )}
          >
            {VENDOR_PROGRESS_LABEL[status]}
          </button>
        ))}
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleStatusClick("NOT_SELECTED")}
          className={clsx(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed",
            progress === "NOT_SELECTED"
              ? "border-akoma-terracotta bg-akoma-terracotta/10 text-akoma-terracotta"
              : "border-akoma-ink/15 text-akoma-ink/60 hover:border-akoma-terracotta/50"
          )}
        >
          {VENDOR_PROGRESS_LABEL.NOT_SELECTED}
        </button>
      </div>

      <VendorProgressTimeline currentStatus={progress} />

      <div className="flex flex-wrap items-center gap-2 border-t border-akoma-ink/10 pt-3">
        <label htmlFor="onboarding-category" className="text-xs font-medium text-akoma-ink/70">
          Which category is this for?
        </label>
        <select
          id="onboarding-category"
          value={category ?? ""}
          disabled={isPending}
          onChange={(e) => handleCategoryChange((e.target.value || null) as OnboardingVendorCategory | null)}
          className="rounded-md border border-akoma-ink/15 px-2 py-1 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        >
          <option value="">Not tracked as a booking category</option>
          {ONBOARDING_VENDOR_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <BookingConfirmationDialog
        open={confirmingBooking}
        vendorName={vendorName}
        categoryLabel={categoryLabel}
        isPending={isPending}
        onCancel={() => setConfirmingBooking(false)}
        onConfirm={handleConfirmBooking}
      />

      <ReplaceVendorDialog
        open={conflict != null}
        existingVendorName={conflict?.vendorName ?? ""}
        newVendorName={vendorName}
        isPending={isPending}
        onKeepCurrent={() => setConflict(null)}
        onReplace={handleReplaceConfirm}
      />

      <SaveBookingToBudgetDialog
        open={showSaveToBudget}
        vendorCategory={vendorCategory}
        budgetCategories={budgetCategories}
        quoteAmountGHS={quoteAmountGHS}
        priceLowGHS={priceLowGHS}
        onClose={() => setShowSaveToBudget(false)}
      />
    </div>
  );
}
