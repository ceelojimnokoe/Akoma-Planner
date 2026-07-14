// src/components/traditional-ceremony/TraditionalCeremonyItemRow.tsx
//
// One editable row — same save-on-blur MoneyInput pattern as
// BudgetCategoryRow.tsx, extended with an editable name/category (text,
// same save-on-blur convention) and a done/pending Checkbox toggle.

"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { updateTraditionalCeremonyItem, deleteTraditionalCeremonyItem } from "@/server/actions/traditional-ceremony";
import { formatGHS } from "@/lib/currency";
import { getRemainingTone } from "@/lib/budget-tone";
import { VALUE_TONE_CLASSES } from "@/components/dashboard/StatCard";
import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Badge";

export interface TraditionalCeremonyItemSummary {
  id: string;
  name: string;
  category: string;
  allocatedGHS: number;
  spentGHS: number;
  done: boolean;
  remainingInCategory: number;
  isOverBudget: boolean;
}

export function TraditionalCeremonyItemRow({ item }: { item: TraditionalCeremonyItemSummary }) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [allocated, setAllocated] = useState(item.allocatedGHS === 0 ? "" : String(item.allocatedGHS));
  const [spent, setSpent] = useState(item.spentGHS === 0 ? "" : String(item.spentGHS));
  const [isPending, startTransition] = useTransition();

  function saveName() {
    if (!name.trim() || name === item.name) return;
    startTransition(async () => {
      await updateTraditionalCeremonyItem({ id: item.id, name: name.trim() });
    });
  }

  function saveCategory() {
    if (!category.trim() || category === item.category) return;
    startTransition(async () => {
      await updateTraditionalCeremonyItem({ id: item.id, category: category.trim() });
    });
  }

  function saveAllocated() {
    const value = Number(allocated);
    if (Number.isNaN(value) || value === item.allocatedGHS) return;
    startTransition(async () => {
      await updateTraditionalCeremonyItem({ id: item.id, allocatedGHS: value });
    });
  }

  function saveSpent() {
    const value = Number(spent);
    if (Number.isNaN(value) || value === item.spentGHS) return;
    startTransition(async () => {
      await updateTraditionalCeremonyItem({ id: item.id, spentGHS: value });
    });
  }

  function toggleDone() {
    startTransition(async () => {
      await updateTraditionalCeremonyItem({ id: item.id, done: !item.done });
    });
  }

  function handleDelete() {
    if (!confirm(`Remove "${item.name}" from your traditional ceremony list?`)) return;
    startTransition(async () => {
      await deleteTraditionalCeremonyItem(item.id);
    });
  }

  return (
    <tr className={isPending ? "opacity-50" : undefined}>
      <td className="py-3 pr-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          className="w-full min-w-[8rem] rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-akoma-ink hover:border-akoma-ink/15 focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        />
      </td>
      <td className="py-3 pr-4">
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onBlur={saveCategory}
          className="w-full min-w-[7rem] rounded-md border border-transparent bg-transparent px-1 py-0.5 text-xs text-akoma-ink/70 hover:border-akoma-ink/15 focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        />
      </td>
      <td className="py-3 pr-4">
        <MoneyInput value={allocated} onChange={setAllocated} onBlur={saveAllocated} />
      </td>
      <td className="py-3 pr-4">
        <MoneyInput value={spent} onChange={setSpent} onBlur={saveSpent} />
      </td>
      <td className="py-3 pr-4 text-sm">
        <span
          className={clsx(
            VALUE_TONE_CLASSES[getRemainingTone(item.spentGHS, item.remainingInCategory)],
            item.isOverBudget && "font-medium"
          )}
        >
          {formatGHS(item.remainingInCategory)}
        </span>
        {item.isOverBudget && <span className="ml-1 text-xs text-akoma-terracotta">over</span>}
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <Checkbox checked={item.done} onChange={toggleDone} ariaLabel={`Mark ${item.name} as ${item.done ? "pending" : "complete"}`} />
          <Badge tone={item.done ? "green" : "neutral"}>{item.done ? "Complete" : "Pending"}</Badge>
        </div>
      </td>
      <td className="py-3 text-right">
        <button onClick={handleDelete} className="text-xs text-akoma-ink/40 hover:text-akoma-terracotta" aria-label={`Remove ${item.name}`}>
          Remove
        </button>
      </td>
    </tr>
  );
}

function MoneyInput({ value, onChange, onBlur }: { value: string; onChange: (v: string) => void; onBlur: () => void }) {
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
        className="w-24 rounded-md border border-akoma-ink/15 px-2 py-1 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
      />
    </div>
  );
}
