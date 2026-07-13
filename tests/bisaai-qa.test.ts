// tests/bisaai-qa.test.ts
//
// generateQAAnswer and generateProactiveSuggestions are the pure "smart
// without an API" core (lib/bisaai-qa.ts) — no Prisma, so they're tested
// directly against a hand-built WeddingContext fixture, the same way
// lib/budget.ts/lib/guests.ts are tested against plain data rather than
// a database.

import { describe, expect, it } from "vitest";
import { generateProactiveSuggestions, generateQAAnswer, getStarterPrompts } from "@/lib/bisaai-qa";
import type { WeddingContext } from "@/lib/bisaai-context";

function buildContext(overrides: Partial<WeddingContext> = {}): WeddingContext {
  return {
    weddingDate: new Date(2026, 10, 1),
    daysUntil: 90,
    guestEstimate: 200,
    budget: {
      totalBudgetGHS: 100_000,
      totalAllocatedGHS: 80_000,
      totalSpentGHS: 50_000,
      unallocatedGHS: 20_000,
      remainingGHS: 50_000,
      percentSpent: 50,
      categories: [],
    },
    guests: {
      totalRecords: 100,
      confirmedRecords: 60,
      pendingRecords: 35,
      totalAttendees: 120,
      confirmedAttendees: 70,
      pendingAttendees: 40,
      declinedAttendees: 10,
    },
    checklist: { percent: 50, doneCount: 10, totalCount: 20, overdueCount: 0, upcomingCount: 10 },
    vendors: { bookedCount: 5, totalCount: 12, byCategory: {} },
    style: { theme: null, primaryColor: null, secondaryColor: null, venueName: null, tradition: "Akan" },
    ...overrides,
  };
}

describe("generateQAAnswer", () => {
  it("grounds a budget question in real numbers", () => {
    const ctx = buildContext();
    const { answer, topic } = generateQAAnswer("How's my budget looking?", ctx);
    expect(topic).toBe("budget");
    expect(answer).toContain("50%");
  });

  it("matches the spec's exact 'guests planned vs accepted' style for RSVP questions", () => {
    const ctx = buildContext({
      guests: { totalRecords: 200, confirmedRecords: 48, pendingRecords: 140, totalAttendees: 210, confirmedAttendees: 48, pendingAttendees: 150, declinedAttendees: 12 },
      daysUntil: 90,
    });
    const { answer, topic } = generateQAAnswer("How are my RSVPs going?", ctx);
    expect(topic).toBe("rsvp");
    expect(answer).toContain("210");
    expect(answer).toContain("48");
  });

  it("returns a fallback with starter-prompt follow-ups for an unrecognized question", () => {
    const ctx = buildContext();
    const { topic, suggestedFollowUps } = generateQAAnswer("What's the meaning of life?", ctx);
    expect(topic).toBe("fallback");
    expect(suggestedFollowUps.length).toBeGreaterThan(0);
    expect(getStarterPrompts()).toEqual(expect.arrayContaining(suggestedFollowUps));
  });

  it("varies its angle when the same topic is asked again", () => {
    const ctx = buildContext();
    const first = generateQAAnswer("How's my budget looking?", ctx, []);
    const second = generateQAAnswer("What about my budget?", ctx, ["How's my budget looking?"]);
    expect(second.topic).toBe("budget");
    expect(second.answer).not.toBe(first.answer);
  });

  it("wraps back to the first angle once every angle has been used", () => {
    const ctx = buildContext();
    const first = generateQAAnswer("budget", ctx, []);
    const prior = ["budget", "budget", "budget"]; // 3 prior asks, topic has 3 angles -> wraps to angle 0
    const fourth = generateQAAnswer("budget", ctx, prior);
    expect(fourth.answer).toBe(first.answer);
  });

  it("each topic carries its own suggested follow-ups", () => {
    const ctx = buildContext();
    const { suggestedFollowUps } = generateQAAnswer("Give me a cost-saving tip", ctx);
    expect(suggestedFollowUps.length).toBeGreaterThanOrEqual(2);
  });
});

describe("generateProactiveSuggestions", () => {
  it("stays silent on a healthy, unremarkable context", () => {
    const ctx = buildContext({
      budget: { totalBudgetGHS: 100_000, totalAllocatedGHS: 50_000, totalSpentGHS: 30_000, unallocatedGHS: 50_000, remainingGHS: 70_000, percentSpent: 30, categories: [] },
      checklist: { percent: 40, doneCount: 8, totalCount: 20, overdueCount: 0, upcomingCount: 12 },
      guests: { totalRecords: 50, confirmedRecords: 20, pendingRecords: 7, totalAttendees: 55, confirmedAttendees: 22, pendingAttendees: 8, declinedAttendees: 5 },
      daysUntil: 200,
    });
    const suggestions = generateProactiveSuggestions(ctx);
    expect(suggestions.find((s) => s.id === "budget-high")).toBeUndefined();
    expect(suggestions.find((s) => s.id === "checklist-overdue")).toBeUndefined();
  });

  it("fires budget-high at 80%+ spent and budget-over (not both) at 100%+", () => {
    const high = generateProactiveSuggestions(buildContext({ budget: { ...buildContext().budget, percentSpent: 85 } }));
    expect(high.some((s) => s.id === "budget-high")).toBe(true);
    expect(high.some((s) => s.id === "budget-over")).toBe(false);

    const over = generateProactiveSuggestions(buildContext({ budget: { ...buildContext().budget, percentSpent: 105 } }));
    expect(over.some((s) => s.id === "budget-over")).toBe(true);
    expect(over.some((s) => s.id === "budget-high")).toBe(false);
  });

  it("flags an unbooked critical vendor category inside 10 weeks", () => {
    const ctx = buildContext({
      daysUntil: 50,
      vendors: { bookedCount: 2, totalCount: 12, byCategory: { VENUE: "BOOKED", CATERER: "BOOKED", PHOTOGRAPHER: "NOT_STARTED" } },
    });
    const suggestions = generateProactiveSuggestions(ctx);
    const suggestion = suggestions.find((s) => s.id === "vendor-unbooked-urgent");
    expect(suggestion).toBeDefined();
    expect(suggestion?.message).toContain("Photographer");
  });

  it("flags overdue checklist tasks", () => {
    const ctx = buildContext({ checklist: { percent: 40, doneCount: 8, totalCount: 20, overdueCount: 3, upcomingCount: 9 } });
    const suggestions = generateProactiveSuggestions(ctx);
    expect(suggestions.find((s) => s.id === "checklist-overdue")?.message).toContain("3");
  });

  it("flags a large pending-RSVP backlog", () => {
    const ctx = buildContext({
      guests: { totalRecords: 100, confirmedRecords: 20, pendingRecords: 60, totalAttendees: 100, confirmedAttendees: 20, pendingAttendees: 60, declinedAttendees: 20 },
    });
    const suggestions = generateProactiveSuggestions(ctx);
    expect(suggestions.some((s) => s.id === "rsvp-backlog")).toBe(true);
  });

  it("gives positive reinforcement when ahead of schedule", () => {
    const ctx = buildContext({ checklist: { percent: 70, doneCount: 14, totalCount: 20, overdueCount: 0, upcomingCount: 6 }, daysUntil: 100 });
    const suggestions = generateProactiveSuggestions(ctx);
    expect(suggestions.some((s) => s.id === "ahead-of-schedule")).toBe(true);
  });

  it("sorts warnings before info before positive", () => {
    const ctx = buildContext({
      budget: { ...buildContext().budget, percentSpent: 90 },
      checklist: { percent: 70, doneCount: 14, totalCount: 20, overdueCount: 2, upcomingCount: 4 },
      guests: { totalRecords: 100, confirmedRecords: 20, pendingRecords: 60, totalAttendees: 100, confirmedAttendees: 20, pendingAttendees: 60, declinedAttendees: 20 },
    });
    const suggestions = generateProactiveSuggestions(ctx);
    const severities = suggestions.map((s) => s.severity);
    const warningIdx = severities.lastIndexOf("warning");
    const infoIdx = severities.indexOf("info");
    if (warningIdx !== -1 && infoIdx !== -1) {
      expect(warningIdx).toBeLessThan(infoIdx);
    }
  });
});
