// src/components/calendar/UpcomingTasksPanel.tsx
//
// Complements the calendar (per spec: "beneath or beside... not
// replace") — a list of this month's not-yet-done tasks, always visible
// regardless of which view (month/week/agenda) is active. The page still
// fetches the data; this component just renders it and owns the shared
// "which task's details are open" state for the whole list — same
// click-to-open-TaskDetailsModal behavior every other task list in the
// app now has (CalendarView's day chips/agenda, ChecklistItemRow,
// Dashboard's FocusTaskList).

"use client";

import { useState } from "react";
import type { ChecklistItem } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/dates";
import { PRIORITY_TONE } from "@/components/checklist/ChecklistItemRow";
import { TaskDetailsModal } from "@/components/tasks/TaskDetailsModal";

export function UpcomingTasksPanel({ tasks }: { tasks: ChecklistItem[] }) {
  const [selectedTask, setSelectedTask] = useState<ChecklistItem | null>(null);

  return (
    <div className="rounded-lg border border-akoma-ink/10 bg-white p-4">
      <h2 className="mb-3 font-semibold text-akoma-ink">Upcoming this month</h2>
      {tasks.length === 0 ? (
        <p className="text-sm text-akoma-ink/50">Nothing outstanding this month.</p>
      ) : (
        <ul className="divide-y divide-akoma-ink/10">
          {tasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => setSelectedTask(task)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-akoma-cream/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-akoma-ink">{task.title}</p>
                  <p className="text-xs text-akoma-ink/50">{task.category}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}</Badge>
                  {task.dueDate && <span className="text-xs text-akoma-ink/50">{formatDate(task.dueDate)}</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <TaskDetailsModal task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
}
