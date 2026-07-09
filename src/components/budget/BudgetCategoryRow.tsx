// src/components/budget/BudgetCategoryRow.tsx
//
// One editable row in the budget table. Saves on blur (not on every
// keystroke) so we're not hammering the server action while the user is
// still typing — a common, simple pattern for inline-editable numbers.

"use client";

import { useState, useTransition } from "react";
import type { BudgetCategorySummary } from "@/lib/budget";
import { updateBudgetCategory, deleteBudgetCategory } from "@/server/actions/budget";
import { formatGHS } from "@/lib/currency";

export function BudgetCategoryRow({ category }: { category: BudgetCategorySummary }) {
  const [allocated, setAllocated] = useState(String(category.allocatedGHS));
  const [spent, setSpent] = useState(String(category.spentGHS));
  const [isPending, startTransition] = useTransition();

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
        <p className="text-xs text-akoma-ink/50">{category.percentOfTotalBudget.toFixed(1)}% of total budget</p>
      </td>
      <td className="py-3 pr-4">
        <MoneyInput value={allocated} onChange={setAllocated} onBlur={saveAllocated} />
      </td>
      <td className="py-3 pr-4">
        <MoneyInput value={spent} onChange={setSpent} onBlur={saveSpent} />
      </td>
      <td className="py-3 pr-4 text-sm">
        <span className={category.isOverBudget ? "font-medium text-akoma-terracotta" : "text-akoma-ink/70"}>
          {formatGHS(category.remainingInCategory)}
        </span>
        {category.isOverBudget && <span className="ml-1 text-xs text-akoma-terracotta">over</span>}
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
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-28 rounded-md border border-akoma-ink/15 px-2 py-1 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
      />
    </div>
  );
}
