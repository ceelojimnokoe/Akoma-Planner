// src/components/checklist/ChecklistItemRow.tsx
//
// One checklist row: a checkbox (toggles done via server action,
// optimistic on the client), a clickable title (opens the Task Details
// modal — components/tasks/TaskDetailsModal.tsx — for notes/full detail),
// a priority selector, and a delete control. Optimistic update on the
// checkbox specifically matters here — a checkbox that visibly lags a
// network round-trip feels broken in a way a text field saving on blur
// doesn't.
//
// The done/priority `useState`s below re-sync to fresh props via a
// useEffect — necessary now that the modal is a *second* independent
// surface that can also toggle done/change priority for this same row
// (previously this row was the only thing that ever mutated those two
// fields, so a stale local copy was never observable). Without this,
// toggling done inside the modal and closing it would leave this row's
// own checkbox showing the old state until a hard refresh.

"use client";

import { useEffect, useState, useTransition } from "react";
import type { ChecklistItem } from "@prisma/client";
import { toggleChecklistItem, deleteChecklistItem, updateChecklistItemPriority } from "@/server/actions/checklist";
import { formatDate, daysUntil } from "@/lib/dates";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { TaskDetailsModal } from "@/components/tasks/TaskDetailsModal";
import clsx from "clsx";

type Priority = ChecklistItem["priority"];

// A real traffic light now: HIGH borrows the overdue color on purpose,
// so a HIGH-priority task and an overdue task read as equally urgent at
// a glance instead of competing for attention. LOW uses green — calm/
// on-track, distinct from the grey "Custom" badge nearby so the two
// don't blur together. Exported so dashboard's FocusTaskList and the
// calendar views render the same colors instead of a second, driftable
// copy of this map.
export const PRIORITY_TONE: Record<Priority, "terracotta" | "gold" | "green"> = {
  HIGH: "terracotta",
  MEDIUM: "gold",
  LOW: "green",
};

export function ChecklistItemRow({ item }: { item: ChecklistItem }) {
  const [done, setDone] = useState(item.done);
  const [priority, setPriority] = useState<Priority>(item.priority);
  const [showDetails, setShowDetails] = useState(false);
  const [isPending, startTransition] = useTransition();
  const overdue = !done && item.dueDate && daysUntil(item.dueDate) < 0;

  useEffect(() => {
    setDone(item.done);
    setPriority(item.priority);
  }, [item.done, item.priority]);

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
      <div className="flex flex-1 items-center gap-3">
        <Checkbox checked={done} onChange={handleToggle} ariaLabel={`Mark ${item.title} as done`} />
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className={clsx(
            "text-left text-sm transition-colors duration-200 hover:text-akoma-green hover:underline",
            done ? "text-akoma-ink/40 line-through" : "text-akoma-ink"
          )}
        >
          {item.title}
        </button>
        {!item.isDefault && <Badge tone="neutral">Custom</Badge>}
        {item.notes && <span title="Has notes" aria-label="Has notes" className="text-xs text-akoma-ink/40">📝</span>}
      </div>
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
      {showDetails && <TaskDetailsModal task={item} onClose={() => setShowDetails(false)} />}
    </li>
  );
}
