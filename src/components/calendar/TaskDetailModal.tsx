// src/components/calendar/TaskDetailModal.tsx
//
// The popup a calendar task chip opens into — reuses Modal.tsx (this
// codebase's one overlay primitive) rather than building a new one.
// `description` is real per-item copy from checklist-defaults.ts (blank
// for custom tasks); the "planning tip" is a separate, static,
// category-keyed lookup (CATEGORY_TIPS) — not stored on the task at all,
// so it's available even for a custom task with no description of its
// own, as long as its category matches a known one.

"use client";

import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/dates";
import { CATEGORY_TIPS } from "@/lib/checklist-defaults";
import { PRIORITY_TONE } from "@/components/checklist/ChecklistItemRow";

export interface CalendarTask {
  id: string;
  title: string;
  category: string;
  description: string | null;
  dueDate: Date | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  done: boolean;
}

export function TaskDetailModal({ task, onClose }: { task: CalendarTask | null; onClose: () => void }) {
  if (!task) return null;
  const tip = CATEGORY_TIPS[task.category];

  return (
    <Modal open={Boolean(task)} onClose={onClose} title={task.title}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}</Badge>
          <Badge tone="neutral">{task.category}</Badge>
          {task.done && <Badge tone="green">Done</Badge>}
        </div>
        {task.dueDate && <p className="text-sm text-akoma-ink/70">Due {formatDate(task.dueDate)}</p>}
        {task.description && <p className="text-sm text-akoma-ink/80">{task.description}</p>}
        {tip && (
          <div className="rounded-lg bg-akoma-gold/5 px-3 py-2 text-sm text-akoma-ink/70">
            <span className="font-medium text-akoma-ink">Tip: </span>
            {tip}
          </div>
        )}
      </div>
    </Modal>
  );
}
