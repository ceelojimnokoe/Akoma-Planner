// src/components/calendar/CalendarTaskChip.tsx
//
// Replaces the old plain <p> task label in a day cell — a real button,
// bigger tap target, opens TaskDetailModal on click (state lives in the
// parent CalendarView, this is just the clickable chip itself).

"use client";

import clsx from "clsx";

export function CalendarTaskChip({ title, done, onClick }: { title: string; done: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={clsx(
        "block w-full truncate rounded px-1.5 py-1 text-left text-xs font-medium transition-colors",
        done
          ? "bg-akoma-green/10 text-akoma-green hover:bg-akoma-green/20"
          : "bg-akoma-terracotta/10 text-akoma-terracotta hover:bg-akoma-terracotta/20"
      )}
    >
      {title}
    </button>
  );
}
