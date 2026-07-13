// src/components/calendar/CalendarView.tsx
//
// Renders whichever of the three views (month grid / week grid / agenda
// list) is currently selected, off pre-fetched, already-range-correct
// data the Server Component page hands it — this component makes no
// Prisma calls itself. A single client component (not three separate
// ones) because all three need to share one TaskDetailModal instance
// and its open/closed state; splitting them up would mean either
// duplicating that state or lifting it above this component for no
// real benefit.

"use client";

import { useState } from "react";
import clsx from "clsx";
import { isSameDay, formatDate } from "@/lib/dates";
import { TaskDetailModal, type CalendarTask } from "@/components/calendar/TaskDetailModal";
import { CalendarTaskChip } from "@/components/calendar/CalendarTaskChip";
import { Badge } from "@/components/ui/Badge";
import { PRIORITY_TONE } from "@/components/checklist/ChecklistItemRow";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const VENDOR_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  QUOTED: "Quoted",
  ACCEPTED: "Booked",
  DECLINED: "Declined",
};

export interface CalendarVendorEvent {
  id: string;
  vendorName: string;
  status: string;
  updatedAt: Date;
}

export type CalendarViewMode = "month" | "week" | "agenda";

export function CalendarView({
  view,
  weeks,
  weekDays,
  referenceMonth,
  tasks,
  vendorEvents,
  weddingDate,
  today,
}: {
  view: CalendarViewMode;
  /** Full month grid (Monday-first weeks, padded) — used for month view. */
  weeks: Date[][];
  /** The 7 days of the currently viewed week — used for week view. */
  weekDays: Date[];
  /** 0-indexed month being viewed — only meaningful for month view's
   *  "is this cell in the viewed month or a padding day" check. */
  referenceMonth: number;
  tasks: CalendarTask[];
  vendorEvents: CalendarVendorEvent[];
  weddingDate: Date;
  today: Date;
}) {
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  function tasksForDay(day: Date) {
    return tasks.filter((t) => t.dueDate && isSameDay(t.dueDate, day));
  }
  function eventsForDay(day: Date) {
    return vendorEvents.filter((v) => isSameDay(v.updatedAt, day));
  }

  function renderDayCell(day: Date, inMonth: boolean) {
    const isWeddingDay = isSameDay(day, weddingDate);
    const isPastDay = day.getTime() < todayStart.getTime();
    // One consistent muted treatment for both "outside the viewed month"
    // and "already passed" — they're visually the same kind of
    // de-emphasis, just triggered by different conditions.
    const muted = !inMonth || isPastDay;
    const dueTasks = tasksForDay(day);
    const dayVendorEvents = eventsForDay(day);

    return (
      <div
        key={day.toISOString()}
        className={clsx(
          "min-h-[7.5rem] bg-white p-2",
          muted && "bg-akoma-ink/[0.03] text-akoma-ink/30",
          isWeddingDay && "ring-2 ring-inset ring-akoma-gold"
        )}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className={clsx("text-sm font-semibold", muted ? "text-akoma-ink/30" : "text-akoma-ink/80")}>
            {day.getDate()}
          </span>
          {isWeddingDay && <span title="Wedding day">💍</span>}
        </div>
        <div className="space-y-1">
          {dueTasks.slice(0, 3).map((task) => (
            <CalendarTaskChip key={task.id} title={task.title} done={task.done} onClick={() => setSelectedTask(task)} />
          ))}
          {dueTasks.length > 3 && <p className="text-xs text-akoma-ink/40">+{dueTasks.length - 3} more</p>}
          {dayVendorEvents.slice(0, 2).map((v) => (
            <p
              key={v.id}
              title={`${v.vendorName}: ${VENDOR_STATUS_LABEL[v.status]}`}
              className="truncate rounded bg-akoma-gold/10 px-1.5 py-1 text-xs font-medium text-akoma-gold"
            >
              {v.vendorName}: {VENDOR_STATUS_LABEL[v.status]}
            </p>
          ))}
          {dayVendorEvents.length > 2 && <p className="text-xs text-akoma-ink/40">+{dayVendorEvents.length - 2} more</p>}
        </div>
      </div>
    );
  }

  if (view === "agenda") {
    const sorted = [...tasks].filter((t) => t.dueDate).sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime());

    return (
      <>
        <div className="divide-y divide-akoma-ink/10 overflow-hidden rounded-lg border border-akoma-ink/10 bg-white">
          {sorted.length === 0 ? (
            <p className="p-6 text-center text-sm text-akoma-ink/50">No dated tasks in this range.</p>
          ) : (
            sorted.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelectedTask(task)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-akoma-cream/60"
              >
                <div className="min-w-0">
                  <p className={clsx("truncate text-sm font-medium", task.done ? "text-akoma-ink/40 line-through" : "text-akoma-ink")}>
                    {task.title}
                  </p>
                  <p className="text-xs text-akoma-ink/50">{task.category}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}</Badge>
                  <span className="text-xs text-akoma-ink/50">{task.dueDate && formatDate(task.dueDate)}</span>
                </div>
              </button>
            ))
          )}
        </div>
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      </>
    );
  }

  const gridDays = view === "week" ? weekDays : weeks.flat();

  return (
    <>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-akoma-ink/10">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="bg-akoma-ink/5 px-2 py-1.5 text-center text-xs font-medium text-akoma-ink/50">
            {label}
          </div>
        ))}
        {gridDays.map((day) => renderDayCell(day, view === "week" ? true : day.getMonth() === referenceMonth))}
      </div>
      <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
    </>
  );
}
