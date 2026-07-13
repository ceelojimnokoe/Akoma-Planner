// src/components/guests/GuestEstimateEditor.tsx
//
// Inline-editable version of the guest estimate sentence at the top of
// /guests — the couple's own headcount guess (WeddingPlan.guestEstimate),
// separate from actual Guest rows below. Same optimistic-edit shape as
// other small inline edits in this app (useTransition, roll back on
// failure) — except a Free-plan cap breach isn't a rollback-and-error
// case, it's the UpgradePrompt component, same treatment every other
// requirePass()-style gate in the app uses.

"use client";

import { useState, useTransition } from "react";
import { updateGuestEstimate } from "@/server/actions/wedding";
import { UpgradePrompt } from "@/components/upgrade/UpgradePrompt";

export function GuestEstimateEditor({ weddingPlanId, guestEstimate }: { weddingPlanId: string; guestEstimate: number }) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayedEstimate, setDisplayedEstimate] = useState(guestEstimate);
  const [inputValue, setInputValue] = useState(String(guestEstimate));
  const [error, setError] = useState<string | null>(null);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEditing() {
    setInputValue(String(displayedEstimate));
    setError(null);
    setUpgradeReason(null);
    setIsEditing(true);
  }

  function handleSave() {
    setError(null);
    setUpgradeReason(null);
    const parsed = Number(inputValue);
    if (!Number.isInteger(parsed) || parsed < 1) {
      setError("Enter a whole number of at least 1.");
      return;
    }
    startTransition(async () => {
      const result = await updateGuestEstimate(weddingPlanId, parsed);
      if (result.ok) {
        setDisplayedEstimate(parsed);
        setIsEditing(false);
      } else if (result.upgradeRequired) {
        setUpgradeReason(result.error ?? "Free accounts have a guest limit.");
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  if (!isEditing) {
    return (
      <p className="mt-1 text-sm text-akoma-ink/60">
        Estimated {displayedEstimate} guests —{" "}
        <button type="button" onClick={startEditing} className="font-medium text-akoma-green hover:underline">
          Edit
        </button>
      </p>
    );
  }

  return (
    <div className="mt-1 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={20000}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          aria-label="Estimated guest count"
          className="w-28 rounded-lg border border-akoma-ink/15 px-2 py-1 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-akoma-green px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setError(null);
            setUpgradeReason(null);
          }}
          className="text-sm text-akoma-ink/50 hover:text-akoma-ink"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-sm text-akoma-terracotta">{error}</p>}
      {upgradeReason && <UpgradePrompt reason={upgradeReason} />}
    </div>
  );
}
