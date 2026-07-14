// src/components/traditional-ceremony/AddTraditionalCeremonyItemForm.tsx
//
// Same shape as AddBudgetCategoryForm.tsx, with an extra category field.

"use client";

import { useRef, useState, useTransition } from "react";
import { addTraditionalCeremonyItem } from "@/server/actions/traditional-ceremony";
import { Button } from "@/components/ui/Button";

export function AddTraditionalCeremonyItemForm({ weddingPlanId }: { weddingPlanId: string }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [allocatedGHS, setAllocatedGHS] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nameInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addTraditionalCeremonyItem({
        weddingPlanId,
        name,
        category: category.trim() || "Other",
        allocatedGHS: Number(allocatedGHS) || 0,
      });
      if (!result.ok) {
        setError(result.error ?? "Something went wrong");
        return;
      }
      setName("");
      setCategory("");
      setAllocatedGHS("");
      nameInputRef.current?.focus();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Item</label>
        <input
          ref={nameInputRef}
          type="text"
          required
          placeholder="e.g. Aseda drinks"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-44 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Category</label>
        <input
          type="text"
          placeholder="e.g. Drinks"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-36 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Allocated (GHS)</label>
        <input
          type="number"
          min={0}
          placeholder="0"
          value={allocatedGHS}
          onChange={(e) => setAllocatedGHS(e.target.value)}
          className="w-28 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        />
      </div>
      <Button type="submit" disabled={isPending} size="sm">
        {isPending ? "Adding…" : "Add item"}
      </Button>
      {error && <p className="w-full text-sm text-akoma-terracotta">{error}</p>}
    </form>
  );
}
