// src/lib/checklist-sort.ts
//
// Pure sort/filter helpers for the dashboard's "This week's focus" and
// "Upcoming tasks" widgets — kept separate from the page so they're
// testable without a database, same pattern as lib/budget.ts/lib/guests.ts.

type Priority = "LOW" | "MEDIUM" | "HIGH";

interface SortableChecklistItem {
  done: boolean;
  dueDate: Date | null;
  priority: Priority;
}

const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/** "This week's focus": every incomplete task, nearest due date first —
 *  priority only breaks a tie when two tasks share a due date (or both
 *  have none). Undated tasks sort last, same "nulls last" reasoning as
 *  the Checklist page's own query. */
export function sortByFocusPriority<T extends SortableChecklistItem>(items: T[]): T[] {
  return [...items]
    .filter((i) => !i.done)
    .sort((a, b) => {
      const aTime = a.dueDate?.getTime() ?? Infinity;
      const bTime = b.dueDate?.getTime() ?? Infinity;
      return aTime !== bTime ? aTime - bTime : PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    });
}

/** "Upcoming tasks": HIGH/MEDIUM tasks first; LOW-priority tasks only
 *  backfill the list once there aren't enough higher-priority tasks to
 *  fill it, rather than being excluded outright. */
export function selectUpcomingTasks<T extends SortableChecklistItem>(items: T[], limit: number): T[] {
  const incomplete = items.filter((i) => !i.done);
  const notLow = incomplete.filter((i) => i.priority !== "LOW");
  const low = incomplete.filter((i) => i.priority === "LOW");
  return [...notLow, ...low].slice(0, limit);
}
