// src/components/calendar/UpcomingTasksPanel.tsx
//
// Complements the calendar (per spec: "beneath or beside... not
// replace") — a plain list of this month's not-yet-done tasks, always
// visible regardless of which view (month/week/agenda) is active. Purely
// presentational; the page fetches the data.

import type { ChecklistItem } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/dates";
import { PRIORITY_TONE } from "@/components/checklist/ChecklistItemRow";

export function UpcomingTasksPanel({ tasks }: { tasks: ChecklistItem[] }) {
  return (
    <div className="rounded-lg border border-akoma-ink/10 bg-white p-4">
      <h2 className="mb-3 font-semibold text-akoma-ink">Upcoming this month</h2>
      {tasks.length === 0 ? (
        <p className="text-sm text-akoma-ink/50">Nothing outstanding this month.</p>
      ) : (
        <ul className="divide-y divide-akoma-ink/10">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-akoma-ink">{task.title}</p>
                <p className="text-xs text-akoma-ink/50">{task.category}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}</Badge>
                {task.dueDate && <span className="text-xs text-akoma-ink/50">{formatDate(task.dueDate)}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
