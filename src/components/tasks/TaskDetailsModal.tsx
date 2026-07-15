// src/components/tasks/TaskDetailsModal.tsx
//
// The task-details popup — opened from the Calendar (day chips, agenda
// rows, the upcoming-this-month panel), the Checklist page, and the
// Dashboard's "This week's focus" list. Lives under components/tasks/
// rather than components/calendar/ (where it started) because it's now a
// genuinely cross-cutting concern, not a calendar-specific one — same
// "one place, many call sites" convention as e.g. lib/vendor-images.ts.
//
// Reuses Modal.tsx (this codebase's one overlay primitive). `description`
// is real per-item copy from checklist-defaults.ts (blank for custom
// tasks) and stays read-only; the "planning tip" is a separate, static,
// category-keyed lookup (CATEGORY_TIPS), also read-only. `notes` is the
// one couple-authored field, and the only thing this modal can actually
// edit here beyond done/priority (see the header comment on
// ChecklistItemRow.tsx for why done/priority also need to be editable
// here, not just notes).
//
// TaskDetailsModalBody is keyed by task.id from the parent below — React's
// own "reset state via key" pattern, so every local edit field
// (done/priority/notes draft) starts fresh from the real task whenever a
// *different* task opens, without a useEffect to keep in sync.

"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/dates";
import { CATEGORY_TIPS } from "@/lib/checklist-defaults";
import { PRIORITY_TONE } from "@/components/checklist/ChecklistItemRow";
import { toggleChecklistItem, updateChecklistItemPriority, updateChecklistItemNotes } from "@/server/actions/checklist";

type Priority = "LOW" | "MEDIUM" | "HIGH";

export interface ChecklistTask {
  id: string;
  title: string;
  category: string;
  description: string | null;
  notes: string | null;
  dueDate: Date | null;
  priority: Priority;
  done: boolean;
}

export function TaskDetailsModal({ task, onClose }: { task: ChecklistTask | null; onClose: () => void }) {
  if (!task) return null;
  return (
    <Modal open={Boolean(task)} onClose={onClose} title={task.title}>
      <TaskDetailsModalBody key={task.id} task={task} />
    </Modal>
  );
}

function TaskDetailsModalBody({ task }: { task: ChecklistTask }) {
  const [done, setDone] = useState(task.done);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [savedNotes, setSavedNotes] = useState(task.notes ?? "");
  const [notesValue, setNotesValue] = useState(task.notes ?? "");
  const [isPending, startTransition] = useTransition();

  const tip = CATEGORY_TIPS[task.category];
  const notesDirty = notesValue !== savedNotes;

  function handleToggle() {
    const next = !done;
    setDone(next); // optimistic, same pattern as ChecklistItemRow
    startTransition(async () => {
      const result = await toggleChecklistItem(task.id, next);
      if (!result.ok) setDone(!next);
    });
  }

  function handlePriorityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Priority;
    const prev = priority;
    setPriority(next);
    startTransition(async () => {
      const result = await updateChecklistItemPriority(task.id, next);
      if (!result.ok) setPriority(prev);
    });
  }

  function handleSaveNotes() {
    const toSave = notesValue;
    startTransition(async () => {
      const result = await updateChecklistItemNotes(task.id, toSave);
      if (result.ok) setSavedNotes(toSave.trim().slice(0, 2000));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-akoma-ink/70">
          <Checkbox checked={done} onChange={handleToggle} ariaLabel={`Mark ${task.title} as done`} />
          Done
        </label>
        <Badge tone="neutral">{task.category}</Badge>
        {task.dueDate && <span className="text-sm text-akoma-ink/70">Due {formatDate(task.dueDate)}</span>}
      </div>

      <div className="flex items-center gap-1.5">
        <label htmlFor="task-priority" className="text-xs font-medium text-akoma-ink/70">
          Priority
        </label>
        <select
          id="task-priority"
          value={priority}
          onChange={handlePriorityChange}
          className="rounded-md border border-akoma-ink/15 bg-transparent px-1.5 py-0.5 text-xs focus:border-akoma-green focus:outline-none"
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
        <Badge tone={PRIORITY_TONE[priority]}>{priority.charAt(0) + priority.slice(1).toLowerCase()}</Badge>
      </div>

      {task.description && <p className="text-sm text-akoma-ink/80">{task.description}</p>}
      {tip && (
        <div className="rounded-lg bg-akoma-gold/5 px-3 py-2 text-sm text-akoma-ink/70">
          <span className="font-medium text-akoma-ink">Tip: </span>
          {tip}
        </div>
      )}

      <div>
        <label htmlFor="task-notes" className="mb-1 block text-xs font-medium text-akoma-ink/70">
          Notes
        </label>
        <Textarea
          id="task-notes"
          value={notesValue}
          onChange={(e) => setNotesValue(e.target.value)}
          placeholder="Add context for this task — e.g. what to confirm, who to ask, what's been agreed."
        />
        {notesDirty && (
          <div className="mt-2 flex items-center gap-3">
            <Button type="button" size="sm" disabled={isPending} onClick={handleSaveNotes}>
              {isPending ? "Saving…" : "Save notes"}
            </Button>
            <button type="button" onClick={() => setNotesValue(savedNotes)} className="text-xs text-akoma-ink/50 hover:underline">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
