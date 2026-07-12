// src/components/checklist/AddChecklistItemForm.tsx
//
// Add-a-custom-task form. On the Free plan this can fail with an upgrade
// message once FREE_LIMITS.maxCustomChecklistItems is hit — the server
// action is the real gate (see lib/plan.ts canAddChecklistItem), this
// component just displays whatever it says.

"use client";

import { useState, useTransition } from "react";
import { addChecklistItem } from "@/server/actions/checklist";
import { Button, LinkButton } from "@/components/ui/Button";

export function AddChecklistItemForm({
  weddingPlanId,
  categories,
}: {
  weddingPlanId: string;
  categories: string[];
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addChecklistItem({
        weddingPlanId,
        title,
        category: category || "Other",
        dueDate: dueDate || undefined,
        priority,
      });
      if (!result.ok) {
        setError(result.error ?? "Something went wrong");
        return;
      }
      setTitle("");
      setDueDate("");
      setPriority("MEDIUM");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[180px] flex-1">
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">New task</label>
        <input
          type="text"
          required
          placeholder="e.g. Confirm florist delivery time"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClasses}
        />
      </div>
      <div className="w-40">
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Category</label>
        <input
          type="text"
          list="checklist-categories"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputClasses}
        />
        <datalist id="checklist-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="w-40">
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Due date</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={inputClasses}
        />
      </div>
      <div className="w-32">
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Priority</label>
        <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={inputClasses}>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </div>
      <Button type="submit" disabled={isPending} size="sm">
        {isPending ? "Adding…" : "Add task"}
      </Button>
      {error && (
        <div className="w-full rounded-lg bg-akoma-gold/10 px-3 py-2 text-sm text-akoma-ink">
          {error}{" "}
          <LinkButton href="/pricing" size="sm" variant="secondary" className="ml-2">
            Get the Wedding Pass
          </LinkButton>
        </div>
      )}
    </form>
  );
}

const inputClasses =
  "w-full rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green";
