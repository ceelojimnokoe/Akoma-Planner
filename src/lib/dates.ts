// src/lib/dates.ts
//
// Small date helpers shared across the dashboard, calendar, and checklist
// views. Kept separate from lib/checklist-defaults.ts because these are
// generic date utilities, not checklist-specific logic.

/** Whole days between now and `date` (negative if `date` is in the past). */
export function daysUntil(date: Date): number {
  const oneDayMs = 24 * 60 * 60 * 1000;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((target.getTime() - startOfToday.getTime()) / oneDayMs);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GH", { year: "numeric", month: "short", day: "numeric" });
}

/** "YYYY-MM-DD" for pre-filling an <input type="date">'s value from a stored Date. */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** True if both dates fall on the same calendar day (ignores time-of-day). */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Builds a month-view grid: an array of weeks, each an array of 7 Dates,
 * Monday-first, padded with the trailing days of the previous month and
 * the leading days of the next so every week is complete. Pure function —
 * the calendar page just maps over the result and checks isSameDay
 * against whatever events it already fetched.
 */
/**
 * The 7 days (Monday-first) of the week containing `date` — same
 * Monday-first convention and Date-overflow-normalization trick as
 * getMonthGrid below, just for a single week instead of a whole month
 * grid. Used by the calendar's Week view.
 */
export function getWeekDays(date: Date): Date[] {
  // getDay(): 0=Sunday..6=Saturday. Convert to Monday-first (0=Monday..6=Sunday).
  const dayOffset = (date.getDay() + 6) % 7;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayOffset);
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}

export function getMonthGrid(year: number, month: number): Date[][] {
  // getDay(): 0=Sunday..6=Saturday. Convert to Monday-first (0=Monday..6=Sunday).
  const leadingDays = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;

  // Date's constructor normalizes day-of-month overflow/underflow across
  // month boundaries, so `1 - leadingDays + i` correctly spills into the
  // previous/next month without any special-casing here.
  const days = Array.from({ length: totalCells }, (_, i) => new Date(year, month, 1 - leadingDays + i));
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}
