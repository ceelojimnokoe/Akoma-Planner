// tests/checklist-defaults.test.ts
//
// buildDefaultChecklist() used to compute due dates as fixed calendar-day
// offsets from the wedding date with no "today" awareness, so any wedding
// under ~12 months out got tasks born already overdue. These tests guard
// the proportional-rescale fix: every due date must fall within the real
// [today, weddingDate] window, relative ordering must survive the rescale,
// and a long engagement must still spread tasks out rather than bunching
// them at one end.

import { describe, expect, it } from "vitest";
import { buildDefaultChecklist, DEFAULT_CHECKLIST_TEMPLATE } from "@/lib/checklist-defaults";

describe("buildDefaultChecklist", () => {
  it("keeps every due date within [today, weddingDate] for a short engagement", () => {
    const today = new Date(2026, 6, 11);
    const weddingDate = new Date(2026, 10, 11); // 4 months out
    const items = buildDefaultChecklist(weddingDate, today);

    expect(items).toHaveLength(DEFAULT_CHECKLIST_TEMPLATE.length);
    for (const item of items) {
      expect(item.dueDate.getTime()).toBeGreaterThanOrEqual(today.getTime());
      expect(item.dueDate.getTime()).toBeLessThanOrEqual(weddingDate.getTime());
    }
  });

  it("preserves the template's relative ordering", () => {
    const today = new Date(2026, 6, 11);
    const weddingDate = new Date(2026, 10, 11);
    const items = buildDefaultChecklist(weddingDate, today);

    const sortedByTemplateOffset = [...DEFAULT_CHECKLIST_TEMPLATE]
      .map((templateItem, index) => ({ templateItem, dueDate: items[index].dueDate }))
      .sort((a, b) => b.templateItem.daysBeforeWedding - a.templateItem.daysBeforeWedding);

    for (let i = 1; i < sortedByTemplateOffset.length; i++) {
      expect(sortedByTemplateOffset[i].dueDate.getTime()).toBeGreaterThanOrEqual(
        sortedByTemplateOffset[i - 1].dueDate.getTime()
      );
    }
  });

  it("the item with the largest daysBeforeWedding has the earliest due date", () => {
    const today = new Date(2026, 6, 11);
    const weddingDate = new Date(2026, 10, 11);
    const items = buildDefaultChecklist(weddingDate, today);

    const maxOffsetIndex = DEFAULT_CHECKLIST_TEMPLATE.reduce(
      (bestIndex, item, index) =>
        item.daysBeforeWedding > DEFAULT_CHECKLIST_TEMPLATE[bestIndex].daysBeforeWedding ? index : bestIndex,
      0
    );
    const earliestDueDate = Math.min(...items.map((item) => item.dueDate.getTime()));

    expect(items[maxOffsetIndex].dueDate.getTime()).toBe(earliestDueDate);
  });

  it("still spreads tasks across a long (12+ month) engagement instead of collapsing to one end", () => {
    const today = new Date(2026, 6, 11);
    const weddingDate = new Date(2028, 6, 11); // 2 years out
    const items = buildDefaultChecklist(weddingDate, today);

    const dueDates = items.map((item) => item.dueDate.getTime());
    const distinctDueDates = new Set(dueDates);
    expect(distinctDueDates.size).toBeGreaterThan(1);

    const earliest = Math.min(...dueDates);
    const latest = Math.max(...dueDates);
    const spanMs = latest - earliest;
    const windowMs = weddingDate.getTime() - today.getTime();
    expect(spanMs).toBeGreaterThan(windowMs * 0.5);
  });

  it("clamps to weddingDate when the wedding is today or already passed", () => {
    const today = new Date(2026, 6, 11);
    const weddingDate = new Date(2026, 6, 11);
    const items = buildDefaultChecklist(weddingDate, today);

    for (const item of items) {
      expect(item.dueDate.getTime()).toBe(weddingDate.getTime());
    }
  });

  it("defaults today to the current date when omitted", () => {
    const weddingDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const items = buildDefaultChecklist(weddingDate);

    for (const item of items) {
      expect(item.dueDate.getTime()).toBeLessThanOrEqual(weddingDate.getTime());
      expect(item.dueDate.getTime()).toBeGreaterThanOrEqual(Date.now() - 1000);
    }
  });
});
