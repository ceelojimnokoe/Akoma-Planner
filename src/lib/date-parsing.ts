// src/lib/date-parsing.ts
//
// Turns a short natural-language phrase — the kind BisaAI's RESCHEDULE
// intent extracts from a message like "move my cake tasting to next
// Saturday" — into a real Date. Pure and deterministic (always takes a
// reference date rather than reading `new Date()` itself) so it's
// directly unit-testable, same convention as lib/wedding-health.ts's
// `today` override.

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * Supports "today", "tomorrow", "next {weekday}", "in N days(s)", "in N
 * week(s)", falling back to Date.parse for absolute-ish phrases ("July
 * 20", "2026-08-01"). Returns null if nothing parses — the caller treats
 * that as "couldn't understand the date" rather than guessing.
 */
export function parseRelativeDate(phrase: string, referenceDate: Date = new Date()): Date | null {
  const p = phrase.trim().toLowerCase();
  if (!p) return null;

  const today = startOfDay(referenceDate);

  if (p === "today") return today;
  if (p === "tomorrow") return addDays(today, 1);

  const nextWeekdayMatch = p.match(/^next\s+(\w+)$/);
  if (nextWeekdayMatch) {
    const targetDay = WEEKDAYS.indexOf(nextWeekdayMatch[1]);
    if (targetDay === -1) return null;
    const currentDay = today.getDay();
    const daysAhead = ((targetDay - currentDay + 7) % 7) || 7;
    return addDays(today, daysAhead);
  }

  const inDaysMatch = p.match(/^in\s+(\d+)\s+days?$/);
  if (inDaysMatch) return addDays(today, Number(inDaysMatch[1]));

  const inWeeksMatch = p.match(/^in\s+(\d+)\s+weeks?$/);
  if (inWeeksMatch) return addDays(today, Number(inWeeksMatch[1]) * 7);

  const parsed = Date.parse(phrase.trim());
  return Number.isNaN(parsed) ? null : new Date(parsed);
}
