// src/components/dashboard/FocusTaskList.tsx
//
// "This week's focus" list — extracted out of dashboard/page.tsx (a
// Server Component) so each task can open the shared Task Details modal
// on click, same as every other task list in the app now does
// (CalendarView, UpcomingTasksPanel, ChecklistItemRow). Visual markup
// matches exactly what dashboard/page.tsx rendered inline before.

"use client";

import { useState } from "react";
import type { ChecklistItem } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";
import { formatDate, daysUntil } from "@/lib/dates";
import { PRIORITY_TONE } from "@/components/checklist/ChecklistItemRow";
import { TaskDetailsModal } from "@/components/tasks/TaskDetailsModal";

export function FocusTaskList({ tasks }: { tasks: ChecklistItem[] }) {
  const [selectedTask, setSelectedTask] = useState<ChecklistItem | null>(null);

  if (tasks.length === 0) {
    return <p className="text-sm text-akoma-ink/60">Nothing outstanding — nice work.</p>;
  }

  return (
    <>
      <ul className="divide-y divide-akoma-ink/10">
        {tasks.map((task) => (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => setSelectedTask(task)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-akoma-cream/60"
            >
              <div className="flex items-center gap-2">
                <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}</Badge>
                <span className="text-sm font-medium text-akoma-ink">{task.title}</span>
              </div>
              {task.dueDate && (
                <Badge tone={daysUntil(task.dueDate) < 0 ? "terracotta" : "neutral"}>{formatDate(task.dueDate)}</Badge>
              )}
            </button>
          </li>
        ))}
      </ul>
      <TaskDetailsModal task={selectedTask} onClose={() => setSelectedTask(null)} />
    </>
  );
}
