// tests/checklist-sort.test.ts
//
// Pure logic behind the dashboard's "This week's focus" (nearest due
// date first, priority only as a tiebreaker) and "Upcoming tasks"
// (HIGH/MEDIUM first, LOW only backfills) widgets.

import { describe, expect, it } from "vitest";
import { selectUpcomingTasks, sortByFocusPriority } from "@/lib/checklist-sort";

function task(id: string, priority: "LOW" | "MEDIUM" | "HIGH", daysFromNow: number | null, done = false) {
  return {
    id,
    done,
    priority,
    dueDate: daysFromNow === null ? null : new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000),
  };
}

describe("sortByFocusPriority", () => {
  it("sorts by nearest due date regardless of priority", () => {
    const items = [task("a", "LOW", 10), task("b", "HIGH", 30), task("c", "MEDIUM", 2)];
    const sorted = sortByFocusPriority(items);
    expect(sorted.map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("breaks a tie on the same due date by priority (HIGH first)", () => {
    const items = [task("low", "LOW", 5), task("high", "HIGH", 5), task("medium", "MEDIUM", 5)];
    const sorted = sortByFocusPriority(items);
    expect(sorted.map((i) => i.id)).toEqual(["high", "medium", "low"]);
  });

  it("excludes completed tasks", () => {
    const items = [task("a", "HIGH", 1, true), task("b", "LOW", 2)];
    expect(sortByFocusPriority(items).map((i) => i.id)).toEqual(["b"]);
  });

  it("sorts undated tasks last", () => {
    const items = [task("undated", "HIGH", null), task("dated", "LOW", 5)];
    expect(sortByFocusPriority(items).map((i) => i.id)).toEqual(["dated", "undated"]);
  });
});

describe("selectUpcomingTasks", () => {
  it("prefers HIGH/MEDIUM tasks over LOW", () => {
    const items = [task("low1", "LOW", 1), task("high1", "HIGH", 5), task("medium1", "MEDIUM", 3)];
    const result = selectUpcomingTasks(items, 5);
    expect(result.map((i) => i.id)).toEqual(["high1", "medium1", "low1"]);
  });

  it("excludes LOW tasks entirely when higher-priority tasks already fill the limit", () => {
    const items = [
      task("h1", "HIGH", 1),
      task("h2", "HIGH", 2),
      task("m1", "MEDIUM", 3),
      task("l1", "LOW", 4),
      task("l2", "LOW", 5),
    ];
    const result = selectUpcomingTasks(items, 3);
    expect(result.map((i) => i.id)).toEqual(["h1", "h2", "m1"]);
  });

  it("backfills with LOW tasks when there aren't enough higher-priority tasks", () => {
    const items = [task("h1", "HIGH", 1), task("l1", "LOW", 2), task("l2", "LOW", 3)];
    const result = selectUpcomingTasks(items, 5);
    expect(result.map((i) => i.id)).toEqual(["h1", "l1", "l2"]);
  });

  it("excludes completed tasks", () => {
    const items = [task("done", "HIGH", 1, true), task("open", "LOW", 2)];
    expect(selectUpcomingTasks(items, 5).map((i) => i.id)).toEqual(["open"]);
  });
});
