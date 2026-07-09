// src/components/checklist/ChecklistItemRow.tsx
//
// One checklist row: a checkbox (toggles done via server action,
// optimistic on the client) plus a delete control. Optimistic update on
// the checkbox specifically matters here — a checkbox that visibly lags
// a network round-trip feels broken in a way a text field saving on blur
// doesn't.

"use client";

import { useState, useTransition } from "react";
import type { ChecklistItem } from "@prisma/client";
import { toggleChecklistItem, deleteChecklistItem } from "@/server/actions/checklist";
import { formatDate, daysUntil } from "@/lib/dates";
import { Badge } from "@/components/ui/Badge";
import clsx from "clsx";

export function ChecklistItemRow({ item }: { item: ChecklistItem }) {
  const [done, setDone] = useState(item.done);
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

  function handleDelete() {
    startTransition(async () => {
      await deleteChecklistItem(item.id);
    });
  }

  return (
    <li className={clsx("flex items-center justify-between gap-3 py-2.5", isPending && "opacity-60")}>
      <label className="flex flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={done}
          onChange={handleToggle}
          className="h-4 w-4 rounded border-akoma-ink/30 text-akoma-green focus:ring-akoma-green"
        />
        <span className={clsx("text-sm", done ? "text-akoma-ink/40 line-through" : "text-akoma-ink")}>
          {item.title}
        </span>
        {!item.isDefault && <Badge tone="neutral">Custom</Badge>}
      </label>
      <div className="flex items-center gap-2">
        {item.dueDate && (
          <Badge tone={overdue ? "terracotta" : "neutral"}>{formatDate(item.dueDate)}</Badge>
        )}
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
