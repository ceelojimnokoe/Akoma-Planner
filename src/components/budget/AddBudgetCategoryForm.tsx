// src/components/budget/AddBudgetCategoryForm.tsx
//
// Small inline form for adding a new budget category. Kept separate from
// BudgetCategoryRow since it's a genuinely different interaction (create
// vs. edit-in-place).

"use client";

import { useRef, useState, useTransition } from "react";
import { addBudgetCategory } from "@/server/actions/budget";
import { Button } from "@/components/ui/Button";

export function AddBudgetCategoryForm({ weddingPlanId }: { weddingPlanId: string }) {
  const [name, setName] = useState("");
  const [allocatedGHS, setAllocatedGHS] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nameInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addBudgetCategory({
        weddingPlanId,
        name,
        allocatedGHS: Number(allocatedGHS) || 0,
      });
      if (!result.ok) {
        setError(result.error ?? "Something went wrong");
        return;
      }
      setName("");
      setAllocatedGHS("");
      nameInputRef.current?.focus();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 border-t border-akoma-ink/10 pt-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">New category</label>
        <input
          ref={nameInputRef}
          type="text"
          required
          placeholder="e.g. Honeymoon"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-48 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Allocated (GHS)</label>
        <input
          type="number"
          min={0}
          required
          placeholder="0"
          value={allocatedGHS}
          onChange={(e) => setAllocatedGHS(e.target.value)}
          className="w-32 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        />
      </div>
      <Button type="submit" disabled={isPending} size="sm">
        {isPending ? "Adding…" : "Add category"}
      </Button>
      {error && <p className="w-full text-sm text-akoma-terracotta">{error}</p>}
    </form>
  );
}
