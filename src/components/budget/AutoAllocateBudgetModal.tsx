// src/components/budget/AutoAllocateBudgetModal.tsx
//
// "Automatically Allocate My Budget" — opens only when clicked (Modal.tsx
// returns null while closed, so this never touches the server-rendered
// budget page's own hydration at all, same reasoning as
// ImportGuestsModal.tsx/ReportBugModal.tsx). Three steps in one modal:
// choose an approach -> review/adjust a preview -> confirm how to apply
// it against any allocations that already exist.

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  previewBudgetAllocation,
  applyBudgetAllocation,
  type AllocationPreviewResult,
} from "@/server/actions/budget-allocation";
import type { AllocationApproach, AllocationTightness, AllocationPreviewItem } from "@/lib/budget-allocation";
import { formatGHS } from "@/lib/currency";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

type Step = "choose" | "preview" | "confirmMode";

const APPROACHES: Array<{ value: AllocationApproach; title: string; body: string }> = [
  { value: "TIGHT", title: "Tight Budget", body: "Prioritises the essentials, using the lower end of typical vendor pricing." },
  { value: "BALANCED", title: "Balanced Budget", body: "Realistic recommended percentages across every core wedding category." },
  { value: "FLEXIBLE", title: "Flexible Budget", body: "More room for the categories where quality and experience matter most." },
  { value: "VENDOR_BASED", title: "Based on My Budget and Available Vendors", body: "Uses real vendor, accommodation and traditional-list pricing where it exists." },
];

const TIGHTNESS_LABEL: Record<AllocationTightness, string> = {
  TIGHT: "Tight — lean toward the cheapest available options",
  BALANCED: "Balanced — lean toward median/typical pricing",
  FLEXIBLE: "Flexible — lean toward higher-end options",
};

export function AutoAllocateBudgetModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [approach, setApproach] = useState<AllocationApproach>("BALANCED");
  const [tightness, setTightness] = useState<AllocationTightness>("BALANCED");
  const [preview, setPreview] = useState<AllocationPreviewResult | null>(null);
  const [items, setItems] = useState<AllocationPreviewItem[]>([]);
  const [pendingMode, setPendingMode] = useState<"replace" | "fill-empty" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function reset() {
    setStep("choose");
    setApproach("BALANCED");
    setTightness("BALANCED");
    setPreview(null);
    setItems([]);
    setPendingMode(null);
    setError(null);
  }

  function handlePreview() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await previewBudgetAllocation(approach, approach === "VENDOR_BASED" ? tightness : undefined);
        setPreview(result);
        setItems(result.items);
        setStep("preview");
      } catch {
        setError("Couldn't build a preview right now. Please try again.");
      }
    });
  }

  function updateAmount(category: string, value: string) {
    const amount = Number(value);
    if (Number.isNaN(amount)) return;
    setItems((prev) => prev.map((i) => (i.category === category ? { ...i, amountGHS: amount } : i)));
  }

  function handleApplyClick() {
    if (preview?.hasExistingAllocations) {
      setStep("confirmMode");
      return;
    }
    applyWith("replace");
  }

  function applyWith(mode: "replace" | "fill-empty") {
    setError(null);
    setPendingMode(mode);
    startTransition(async () => {
      const response = await applyBudgetAllocation(
        items.map((i) => ({ category: i.category, amountGHS: i.amountGHS })),
        mode
      );
      if (!response.ok) {
        setError(response.error ?? "Couldn't apply the allocation. Please try again.");
        setPendingMode(null);
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  const previewTotal = items.reduce((sum, i) => sum + i.amountGHS, 0);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Automatically Allocate My Budget
      </Button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Automatically allocate my budget"
      >
        {step === "choose" && (
          <div className="space-y-4">
            <p className="text-sm text-akoma-ink/60">Choose how you&apos;d like your total budget spread across categories.</p>
            <div className="space-y-2">
              {APPROACHES.map((a) => (
                <label
                  key={a.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    approach === a.value ? "border-akoma-green bg-akoma-green/5" : "border-akoma-ink/15 hover:border-akoma-ink/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="approach"
                    className="mt-1 h-4 w-4 shrink-0 text-akoma-green focus:ring-akoma-green"
                    checked={approach === a.value}
                    onChange={() => setApproach(a.value)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-akoma-ink">{a.title}</span>
                    <span className="block text-xs text-akoma-ink/60">{a.body}</span>
                  </span>
                </label>
              ))}
            </div>

            {approach === "VENDOR_BASED" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-akoma-ink">Which price point?</label>
                <Select value={tightness} onChange={(e) => setTightness(e.target.value as AllocationTightness)}>
                  {(Object.keys(TIGHTNESS_LABEL) as AllocationTightness[]).map((t) => (
                    <option key={t} value={t}>
                      {TIGHTNESS_LABEL[t]}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {error && <p className="rounded-lg bg-akoma-terracotta/10 px-3 py-2 text-sm text-akoma-terracotta">{error}</p>}

            <Button type="button" onClick={handlePreview} disabled={isPending} className="w-full">
              {isPending ? "Building preview…" : "Preview allocation"}
            </Button>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-akoma-ink/5 px-3 py-2 text-sm">
              <span className="text-akoma-ink/60">Total wedding budget</span>
              <span className="font-medium text-akoma-ink">{formatGHS(preview.totalBudgetGHS)}</span>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-lg border border-akoma-ink/10">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-akoma-cream">
                  <tr className="text-xs uppercase tracking-wide text-akoma-ink/40">
                    <th className="px-2 py-2 font-medium">Category</th>
                    <th className="px-2 py-2 font-medium">%</th>
                    <th className="px-2 py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-akoma-ink/5">
                  {items.map((item) => (
                    <tr key={item.category}>
                      <td className="px-2 py-2 align-top">
                        <p className="font-medium text-akoma-ink">{item.category}</p>
                        <p className="mt-0.5 text-xs text-akoma-ink/50">{item.explanation}</p>
                      </td>
                      <td className="px-2 py-2 align-top text-akoma-ink/70">{item.percent.toFixed(1)}%</td>
                      <td className="px-2 py-2 align-top">
                        <div className="flex items-center gap-0.5">
                          <span className="text-xs text-akoma-ink/40">GH₵</span>
                          <input
                            type="number"
                            min={0}
                            value={item.amountGHS}
                            onChange={(e) => updateAmount(item.category, e.target.value)}
                            className="w-20 rounded-md border border-akoma-ink/15 px-1.5 py-1 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-akoma-ink/5 px-3 py-2 text-sm">
              <span className="text-akoma-ink/60">Total allocated</span>
              <span className={`font-medium ${previewTotal > preview.totalBudgetGHS ? "text-akoma-terracotta" : "text-akoma-ink"}`}>
                {formatGHS(previewTotal)}
                {previewTotal > preview.totalBudgetGHS && " — exceeds your total budget"}
              </span>
            </div>

            {error && <p className="rounded-lg bg-akoma-terracotta/10 px-3 py-2 text-sm text-akoma-terracotta">{error}</p>}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="ghost" onClick={() => setStep("choose")} className="sm:flex-1">
                Try another approach
              </Button>
              <Button
                type="button"
                onClick={handleApplyClick}
                disabled={isPending || previewTotal > preview.totalBudgetGHS}
                className="sm:flex-1"
              >
                Apply this allocation
              </Button>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              className="w-full text-center text-xs text-akoma-ink/50 hover:underline"
            >
              Cancel without changing my budget
            </button>
          </div>
        )}

        {step === "confirmMode" && (
          <div className="space-y-4">
            <p className="text-sm text-akoma-ink">
              Some categories already have an allocation. How should we apply this recommendation?
            </p>
            {error && <p className="rounded-lg bg-akoma-terracotta/10 px-3 py-2 text-sm text-akoma-terracotta">{error}</p>}
            <div className="space-y-2">
              <Button type="button" onClick={() => applyWith("replace")} disabled={isPending} className="w-full">
                {isPending && pendingMode === "replace" ? "Applying…" : "Replace existing allocations"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => applyWith("fill-empty")} disabled={isPending} className="w-full">
                {isPending && pendingMode === "fill-empty" ? "Applying…" : "Fill only empty categories"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setStep("preview")} disabled={isPending} className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
