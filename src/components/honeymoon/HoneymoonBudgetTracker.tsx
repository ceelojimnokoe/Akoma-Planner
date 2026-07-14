// src/components/honeymoon/HoneymoonBudgetTracker.tsx
//
// Standalone Allocated/Spent/Remaining tracker — deliberately not wired
// to any BudgetCategory or WeddingPlan.totalBudgetGHS (see
// HoneymoonPlan's own schema comment: wedding and honeymoon expenses are
// meant to stay separate). Same save-on-blur MoneyInput convention as
// BudgetCategoryRow.tsx.

"use client";

import { useState, useTransition } from "react";
import { updateHoneymoonBudget } from "@/server/actions/honeymoon";
import { formatGHS } from "@/lib/currency";

export function HoneymoonBudgetTracker({
  weddingPlanId,
  allocatedGHS,
  spentGHS,
}: {
  weddingPlanId: string;
  allocatedGHS: number;
  spentGHS: number;
}) {
  const [allocated, setAllocated] = useState(allocatedGHS === 0 ? "" : String(allocatedGHS));
  const [spent, setSpent] = useState(spentGHS === 0 ? "" : String(spentGHS));
  const [, startTransition] = useTransition();
  const remainingGHS = allocatedGHS - spentGHS;

  function saveAllocated() {
    const value = Number(allocated);
    if (Number.isNaN(value) || value === allocatedGHS) return;
    startTransition(async () => {
      await updateHoneymoonBudget({ weddingPlanId, allocatedGHS: value });
    });
  }

  function saveSpent() {
    const value = Number(spent);
    if (Number.isNaN(value) || value === spentGHS) return;
    startTransition(async () => {
      await updateHoneymoonBudget({ weddingPlanId, spentGHS: value });
    });
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <p className="text-xs text-akoma-ink/50">Allocated</p>
        <MoneyInput value={allocated} onChange={setAllocated} onBlur={saveAllocated} />
      </div>
      <div>
        <p className="text-xs text-akoma-ink/50">Spent</p>
        <MoneyInput value={spent} onChange={setSpent} onBlur={saveSpent} />
      </div>
      <div>
        <p className="text-xs text-akoma-ink/50">Remaining</p>
        <p className={`mt-1 text-lg font-semibold ${remainingGHS < 0 ? "text-akoma-terracotta" : "text-akoma-ink"}`}>
          {formatGHS(remainingGHS)}
        </p>
      </div>
    </div>
  );
}

function MoneyInput({ value, onChange, onBlur }: { value: string; onChange: (v: string) => void; onBlur: () => void }) {
  return (
    <div className="mt-1 flex items-center gap-1">
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
