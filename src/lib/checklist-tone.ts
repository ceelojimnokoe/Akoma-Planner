// src/lib/checklist-tone.ts
//
// Same three-tier color pattern as lib/budget-tone.ts, but inverted:
// for a checklist, a HIGHER percent is better (more done), whereas for
// budget a higher percent is worse (more spent) — so the thresholds
// can't just be reused as-is, even though the shape is identical.

export type ChecklistTone = "terracotta" | "gold" | "green";

export function getChecklistTone(percentComplete: number): ChecklistTone {
  if (percentComplete <= 30) return "terracotta";
  if (percentComplete <= 69) return "gold";
  return "green";
}
