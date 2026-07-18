// src/components/dashboard/BookedVendorCostPromptsCard.tsx
//
// "Your Venue is marked as booked — want to add the agreed price to
// your budget?" One card per pending category (see
// lib/booked-vendor-cost-prompts.ts for how "pending" is decided).
// Skipping a prompt only dismisses it for this page view — nothing is
// persisted, so it reappears next visit until either a cost is actually
// recorded or the couple removes/renames the budget category. That's a
// deliberate, small tradeoff (avoids a new "dismissed" column) rather
// than a gap: the prompt is a gentle nudge, never a blocker, and it goes
// away for good the moment real spend is entered.

"use client";

import { useState, useTransition } from "react";
import type { BookedVendorCostPrompt } from "@/lib/booked-vendor-cost-prompts";
import { updateBudgetCategory } from "@/server/actions/budget";
import { formatGHS } from "@/lib/currency";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

export function BookedVendorCostPromptsCard({
  prompts,
  budgetCategories,
}: {
  prompts: BookedVendorCostPrompt[];
  budgetCategories: Array<{ id: string; name: string; allocatedGHS: number }>;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const visible = prompts.filter((p) => !dismissed.has(p.category) && !saved.has(p.category));
  if (visible.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-akoma-ink">Booked vendors — add their cost?</h2>
      <ul className="space-y-3">
        {visible.map((prompt) => (
          <PromptRow
            key={prompt.category}
            prompt={prompt}
            budgetCategories={budgetCategories}
            onSkip={() => setDismissed((prev) => new Set(prev).add(prompt.category))}
            onSaved={() => setSaved((prev) => new Set(prev).add(prompt.category))}
          />
        ))}
      </ul>
    </Card>
  );
}

function PromptRow({
  prompt,
  budgetCategories,
  onSkip,
  onSaved,
}: {
  prompt: BookedVendorCostPrompt;
  budgetCategories: Array<{ id: string; name: string; allocatedGHS: number }>;
  onSkip: () => void;
  onSaved: () => void;
}) {
  const [categoryId, setCategoryId] = useState(prompt.matchedBudgetCategoryId);
  const [amount, setAmount] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedCategory = budgetCategories.find((c) => c.id === categoryId);
  const parsedAmount = Number(amount) || 0;
  const exceedsAllocated = selectedCategory != null && parsedAmount > selectedCategory.allocatedGHS;

  function handleSave() {
    if (!parsedAmount || parsedAmount <= 0) return;
    startTransition(async () => {
      await updateBudgetCategory({ id: categoryId, spentGHS: parsedAmount });
      onSaved();
    });
  }

  return (
    <li className="rounded-lg border border-akoma-ink/10 p-3">
      <p className="text-sm text-akoma-ink">
        Your <span className="font-medium">{prompt.categoryLabel}</span> is marked as booked. Would you like to add
        the agreed price to your {prompt.matchedBudgetCategoryName} budget?
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-akoma-ink/40">GH₵</span>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Agreed price"
            className="w-32 rounded-md border border-akoma-ink/15 px-2 py-1 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
          />
        </div>
        {budgetCategories.length > 1 && (
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-auto text-sm">
            {budgetCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
        <Button type="button" size="sm" disabled={isPending || !amount} onClick={handleSave}>
          {isPending ? "Saving…" : "Add to budget"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={onSkip}>
          Skip for now
        </Button>
      </div>
      {exceedsAllocated && (
        <p className="mt-2 text-xs text-akoma-terracotta">
          This exceeds {selectedCategory!.name}&apos;s allocated budget of {formatGHS(selectedCategory!.allocatedGHS)}.
        </p>
      )}
    </li>
  );
}
