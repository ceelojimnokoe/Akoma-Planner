// src/components/budget/BudgetCategoryRow.tsx
//
// One editable row in the budget table. Saves on blur (not on every
// keystroke) so we're not hammering the server action while the user is
// still typing — a common, simple pattern for inline-editable numbers.

"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import type { BudgetCategorySummary } from "@/lib/budget";
import { updateBudgetCategory, deleteBudgetCategory } from "@/server/actions/budget";
import { formatGHS } from "@/lib/currency";
import { getRemainingTone } from "@/lib/budget-tone";
import { VALUE_TONE_CLASSES } from "@/components/dashboard/StatCard";

export function BudgetCategoryRow({ category }: { category: BudgetCategorySummary }) {
  // Untouched default rows start at 0 — show blank-with-placeholder
  // rather than a literal "0" so an unset category reads as unset, not
  // as a real zero allocation the couple deliberately chose.
  const [allocated, setAllocated] = useState(category.allocatedGHS === 0 ? "" : String(category.allocatedGHS));
  const [spent, setSpent] = useState(category.spentGHS === 0 ? "" : String(category.spentGHS));
  const [isPending, startTransition] = useTransition();
  const isUnset = category.allocatedGHS === 0 && category.spentGHS === 0;

  function saveAllocated() {
    const value = Number(allocated);
    if (Number.isNaN(value) || value === category.allocatedGHS) return;
    startTransition(async () => {
      await updateBudgetCategory({ id: category.id, allocatedGHS: value });
    });
  }

  function saveSpent() {
    const value = Number(spent);
    if (Number.isNaN(value) || value === category.spentGHS) return;
    startTransition(async () => {
      await updateBudgetCategory({ id: category.id, spentGHS: value });
    });
  }

  function handleDelete() {
    if (!confirm(`Remove "${category.name}" from your budget categories?`)) return;
    startTransition(async () => {
      await deleteBudgetCategory(category.id);
    });
  }

  return (
    <tr className={isPending ? "opacity-50" : undefined}>
      <td className="py-3 pr-4">
        <p className="text-sm font-medium text-akoma-ink">{category.name}</p>
        {category.allocatedGHS !== 0 && (
          <p className="text-xs text-akoma-ink/50">{category.percentOfTotalBudget.toFixed(1)}% of total budget</p>
        )}
      </td>
      <td className="py-3 pr-4">
        <MoneyInput value={allocated} onChange={setAllocated} onBlur={saveAllocated} />
      </td>
      <td className="py-3 pr-4">
        <MoneyInput value={spent} onChange={setSpent} onBlur={saveSpent} />
      </td>
      <td className="py-3 pr-4 text-sm">
        {isUnset ? (
          <span className="text-akoma-ink/40">—</span>
        ) : (
          <>
            <span
              className={clsx(
                VALUE_TONE_CLASSES[getRemainingTone(category.spentGHS, category.remainingInCategory)],
                category.isOverBudget && "font-medium"
              )}
            >
              {formatGHS(category.remainingInCategory)}
            </span>
            {category.isOverBudget && <span className="ml-1 text-xs text-akoma-terracotta">over</span>}
          </>
        )}
      </td>
      <td className="py-3 text-right">
        <button
          onClick={handleDelete}
          className="text-xs text-akoma-ink/40 hover:text-akoma-terracotta"
          aria-label={`Remove ${category.name}`}
        >
          Remove
        </button>
      </td>
    </tr>
  );
}

function MoneyInput({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-akoma-ink/40">GH₵</span>
      <input
        type="number"
        min={0}
        value={value}
        placeholder="—"
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-28 rounded-md border border-akoma-ink/15 px-2 py-1 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
      />
    </div>
  );
}
