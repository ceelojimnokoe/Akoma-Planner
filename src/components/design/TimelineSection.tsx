// src/components/design/TimelineSection.tsx
//
// Client-interactive wedding-day timeline: inline-editable time/activity
// fields (blur-to-save, same auto-save shape ChecklistItemRow's priority
// dropdown already uses) plus up/down buttons to reorder — no drag-and-
// drop, matching this codebase's established no-new-dependency-for-
// small-things pattern. Reads its initial rows from getOrCreateTimeline()
// (server component caller below), then owns them locally so edits feel
// instant; each mutation still round-trips through updateTimelineEntry /
// reorderTimelineEntry so a reload always reflects the saved state.

"use client";

import { useState, useTransition } from "react";
import type { TimelineEntry } from "@prisma/client";
import { updateTimelineEntry, reorderTimelineEntry } from "@/server/actions/timeline";
import { Card } from "@/components/ui/Card";
import clsx from "clsx";

export function TimelineSection({ weddingPlanId, entries }: { weddingPlanId: string; entries: TimelineEntry[] }) {
  const [rows, setRows] = useState(entries);
  const [isPending, startTransition] = useTransition();

  function handleFieldBlur(id: string, field: "time" | "activity", value: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || row[field] === value) return;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    startTransition(async () => {
      await updateTimelineEntry(id, weddingPlanId, { [field]: value });
    });
  }

  function handleMove(id: string, direction: -1 | 1) {
    const index = rows.findIndex((r) => r.id === id);
    const swapIndex = index + direction;
    if (index === -1 || swapIndex < 0 || swapIndex >= rows.length) return;
    const next = [...rows];
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    setRows(next); // optimistic — the swap is instant, matching the checklist row pattern
    startTransition(async () => {
      const result = await reorderTimelineEntry(id, weddingPlanId, direction);
      if (!result.ok) setRows(rows); // roll back to the pre-swap order on failure
    });
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-akoma-ink">Wedding day timeline</h2>
        <span className="text-xs text-akoma-ink/40">Edits save automatically</span>
      </div>

      <ol className={clsx("space-y-2", isPending && "opacity-70")}>
        {rows.map((entry, i) => (
          <li key={entry.id} className="flex items-center gap-2 rounded-lg border border-akoma-ink/10 p-2.5">
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => handleMove(entry.id, -1)}
                disabled={i === 0}
                aria-label={`Move ${entry.activity} earlier`}
                className="text-akoma-ink/40 hover:text-akoma-green disabled:cursor-not-allowed disabled:opacity-20"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => handleMove(entry.id, 1)}
                disabled={i === rows.length - 1}
                aria-label={`Move ${entry.activity} later`}
                className="text-akoma-ink/40 hover:text-akoma-green disabled:cursor-not-allowed disabled:opacity-20"
              >
                ▼
              </button>
            </div>
            <input
              type="time"
              defaultValue={entry.time}
              onBlur={(e) => handleFieldBlur(entry.id, "time", e.target.value)}
              aria-label={`Time for ${entry.activity}`}
              className="w-28 shrink-0 rounded-md border border-akoma-ink/15 px-2 py-1.5 text-sm font-medium text-akoma-green focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
            />
            <input
              type="text"
              defaultValue={entry.activity}
              onBlur={(e) => handleFieldBlur(entry.id, "activity", e.target.value)}
              aria-label="Activity"
              className="flex-1 rounded-md border border-transparent px-2 py-1.5 text-sm text-akoma-ink hover:border-akoma-ink/15 focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
            />
            <span className="shrink-0 text-xs text-akoma-ink/40">{entry.durationMinutes} min</span>
          </li>
        ))}
      </ol>

      {rows.length === 0 && <p className="text-sm text-akoma-ink/50">No timeline yet.</p>}
    </Card>
  );
}
