// src/components/checklist/ChecklistItemRow.tsx
//
// One checklist row: a checkbox (toggles done via server action,
// optimistic on the client), a priority selector, and a delete control.
// Optimistic update on the checkbox specifically matters here — a
// checkbox that visibly lags a network round-trip feels broken in a way
// a text field saving on blur doesn't.

"use client";

import { useState, useTransition } from "react";
import type { ChecklistItem } from "@prisma/client";
import { toggleChecklistItem, deleteChecklistItem, updateChecklistItemPriority } from "@/server/actions/checklist";
import { formatDate, daysUntil } from "@/lib/dates";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import clsx from "clsx";

type Priority = ChecklistItem["priority"];

// A real traffic light now: HIGH borrows the overdue color on purpose,
// so a HIGH-priority task and an overdue task read as equally urgent at
// a glance instead of competing for attention. LOW uses green — calm/
// on-track, distinct from the grey "Custom" badge nearby so the two
// don't blur together. Exported so dashboard/page.tsx's "This week's
// focus" list (which now shows every priority, not just HIGH) renders
// the same colors instead of a second, driftable copy of this map.
export const PRIORITY_TONE: Record<Priority, "terracotta" | "gold" | "green"> = {
  HIGH: "terracotta",
  MEDIUM: "gold",
  LOW: "green",
};

export function ChecklistItemRow({ item }: { item: ChecklistItem }) {
  const [done, setDone] = useState(item.done);
  const [priority, setPriority] = useState<Priority>(item.priority);
  const [isPending, startTransition] = useTransition();
  const overdue = !done && item.dueDate && daysUntil(item.dueDate) < 0;

  function handleToggle() {
    const next = !done;
    setDone(next); // optimistic — feels instant even though the write is async
    startTransition(async () => {
      const result = await toggleChecklistItem(item.id, next);
      if (!result.ok) setDone(!next); // roll back on failure
    });
  }

  function handlePriorityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Priority;
    const prev = priority;
    setPriority(next); // optimistic, same pattern as the checkbox above
    startTransition(async () => {
      const result = await updateChecklistItemPriority(item.id, next);
      if (!result.ok) setPriority(prev);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteChecklistItem(item.id);
    });
  }

  return (
    <li className={clsx("flex items-center justify-between gap-3 py-2.5", isPending && "opacity-60")}>
      <label className="flex flex-1 cursor-pointer items-center gap-3">
        <Checkbox checked={done} onChange={handleToggle} ariaLabel={`Mark ${item.title} as done`} />
        <span className={clsx("text-sm transition-colors duration-200", done ? "text-akoma-ink/40 line-through" : "text-akoma-ink")}>
          {item.title}
        </span>
        {!item.isDefault && <Badge tone="neutral">Custom</Badge>}
      </label>
      <div className="flex items-center gap-2">
        {item.dueDate && (
          <Badge tone={overdue ? "terracotta" : "neutral"}>{formatDate(item.dueDate)}</Badge>
        )}
        <div className="flex items-center gap-1">
          <select
            value={priority}
            onChange={handlePriorityChange}
            aria-label={`Priority for ${item.title}`}
            className="rounded-md border border-akoma-ink/15 bg-transparent px-1.5 py-0.5 text-xs focus:border-akoma-green focus:outline-none"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
          <Badge tone={PRIORITY_TONE[priority]}>{priority.charAt(0) + priority.slice(1).toLowerCase()}</Badge>
        </div>
        <button
          onClick={handleDelete}
          className="text-xs text-akoma-ink/40 hover:text-akoma-terracotta"
          aria-label={`Remove ${item.title}`}
        >
          Remove
        </button>
      </div>
    </li>
  );
}
