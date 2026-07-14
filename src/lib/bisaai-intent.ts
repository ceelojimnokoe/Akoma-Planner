// src/lib/bisaai-intent.ts
//
// Layer 2 of BisaAI's three-layer architecture (Layer 1 Chat Interface ->
// Layer 2 Intent Detection -> Layer 3 Application Actions, per the
// request's own future-proofing requirement). This file is the ONLY
// thing a future LLM integration needs to replace: detectIntent() turns
// raw chat text into a structural DetectedIntent, with zero Prisma
// import and zero knowledge of Free vs. Pass — pure, deterministic,
// directly unit-testable (see tests/bisaai-intent.test.ts), same
// convention as lib/bisaai-qa.ts staying Prisma-free.
//
// Deliberately extracts only *structural grammar* here (verb / target /
// status-word / amount), not one intent type per example command in the
// spec — several domains share identical phrasing ("mark X as Y" covers
// vendor status, RSVP, and traditional-item completion alike). Layer 3
// (src/server/actions/bisaai-assistant.ts) owns all domain-specific
// *resolution* of what `target` actually refers to, since only it has
// the wedding's real data to disambiguate.

import type { VendorCategory } from "@prisma/client";
import { VENDOR_CATEGORY_KEYWORDS } from "./vendor-category-labels";

export type AdjustAmountVerb = "increase" | "decrease";
export type AmountField = "allocatedGHS" | "spentGHS";
export type GuestSideWord = "BRIDE" | "GROOM" | "BOTH";

export type DetectedIntent =
  | { type: "QA"; message: string }
  | { type: "MARK_AS"; target: string; statusWord: string }
  | { type: "ADJUST_AMOUNT"; verb: AdjustAmountVerb; target: string; amountGHS: number; field: AmountField }
  | { type: "MOVE_AMOUNT"; amountGHS: number; source: string; dest: string }
  | { type: "ADD_CHECKLIST_ITEM"; title: string }
  | { type: "ADD_GUEST"; name: string; side: GuestSideWord }
  | { type: "FIND_VENDORS"; category?: VendorCategory }
  | { type: "RESCHEDULE"; target: string; whenPhrase: string }
  | { type: "SHOW_OVERSPENDING" }
  | { type: "SHOW_PENDING_RSVPS" }
  | { type: "SHOW_REMAINING_VENDOR_CATEGORIES" }
  | { type: "SHOW_TRADITIONAL_OUTSTANDING" }
  | { type: "SHOW_HONEYMOON_TASKS_LEFT" }
  | { type: "SHOW_DUE_THIS_WEEK" }
  | { type: "SHOW_DEADLINES" }
  | { type: "EXPLAIN_HEALTH_SCORE" };

const AMOUNT = "([\\d][\\d,]*(?:\\.\\d+)?)";

function stripPunctuation(s: string): string {
  return s.trim().replace(/[.!?]+$/, "").trim();
}

function cleanSimpleTarget(s: string): string {
  return stripPunctuation(s).replace(/^(the|my)\s+/i, "").trim();
}

/** Strips leading "my"/"the" and a trailing "budget" — "my venue budget"
 *  -> "venue", "honeymoon budget" -> "honeymoon" — so downstream
 *  resolution matches against a real category/entity name, not the
 *  filler words around it. */
function cleanAmountTarget(s: string): string {
  return stripPunctuation(s)
    .replace(/^(the|my)\s+/i, "")
    .replace(/\s+budget$/i, "")
    .trim();
}

function parseAmount(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

function tryAddGuest(message: string): DetectedIntent | null {
  const m = message.match(/^add\s+(.+?)\s+as\s+(?:the\s+)?(bride|groom|both)(?:'s)?\s+guest[.!?]*$/i);
  if (!m) return null;
  return { type: "ADD_GUEST", name: m[1].trim(), side: m[2].toUpperCase() as GuestSideWord };
}

function tryAddChecklistItem(message: string): DetectedIntent | null {
  let m = message.match(/^add\s+a\s+reminder\s+to\s+(.+?)[.!?]*$/i);
  if (!m) m = message.match(/^create\s+a\s+task\s+to\s+(.+?)[.!?]*$/i);
  if (!m) return null;
  const title = m[1].trim();
  return { type: "ADD_CHECKLIST_ITEM", title: title.charAt(0).toUpperCase() + title.slice(1) };
}

function tryMoveAmount(message: string): DetectedIntent | null {
  const m = message.match(new RegExp(`^move\\s+(?:ghs\\s*)?${AMOUNT}\\s+from\\s+(.+?)\\s+to\\s+(.+?)[.!?]*$`, "i"));
  if (!m) return null;
  return { type: "MOVE_AMOUNT", amountGHS: parseAmount(m[1]), source: cleanAmountTarget(m[2]), dest: cleanAmountTarget(m[3]) };
}

function tryReschedule(message: string): DetectedIntent | null {
  const m = message.match(/^move\s+(?:my|the)\s+(.+?)\s+to\s+(.+?)[.!?]*$/i);
  if (!m) return null;
  return { type: "RESCHEDULE", target: cleanSimpleTarget(m[1]), whenPhrase: stripPunctuation(m[2]) };
}

function tryAdjustAmount(message: string): DetectedIntent | null {
  const field: AmountField = /\b(spent|spend|paid)\b/i.test(message) ? "spentGHS" : "allocatedGHS";

  let m = message.match(new RegExp(`^add\\s+(?:ghs\\s*)?${AMOUNT}\\s+to\\s+(.+?)[.!?]*$`, "i"));
  if (m) return { type: "ADJUST_AMOUNT", verb: "increase", target: cleanAmountTarget(m[2]), amountGHS: parseAmount(m[1]), field };

  m = message.match(new RegExp(`^increase\\s+(.+?)\\s+by\\s+(?:ghs\\s*)?${AMOUNT}`, "i"));
  if (m) return { type: "ADJUST_AMOUNT", verb: "increase", target: cleanAmountTarget(m[1]), amountGHS: parseAmount(m[2]), field };

  m = message.match(new RegExp(`^(?:decrease|reduce|lower)\\s+(.+?)\\s+by\\s+(?:ghs\\s*)?${AMOUNT}`, "i"));
  if (m) return { type: "ADJUST_AMOUNT", verb: "decrease", target: cleanAmountTarget(m[1]), amountGHS: parseAmount(m[2]), field };

  return null;
}

function tryMarkAs(message: string): DetectedIntent | null {
  const markMatch = message.match(/^(?:mark|set)\s+(.+?)\s+as\s+(.+?)[.!?]*$/i);
  if (markMatch) return { type: "MARK_AS", target: cleanSimpleTarget(markMatch[1]), statusWord: stripPunctuation(markMatch[2]).toLowerCase() };

  const bookMatch = message.match(/^book\s+(.+?)[.!?]*$/i);
  if (bookMatch) return { type: "MARK_AS", target: cleanSimpleTarget(bookMatch[1]), statusWord: "booked" };

  return null;
}

function findVendorCategoryKeyword(lower: string): VendorCategory | undefined {
  const entries = (Object.entries(VENDOR_CATEGORY_KEYWORDS) as [VendorCategory, string[]][])
    .flatMap(([category, keywords]) => keywords.map((keyword) => ({ category, keyword })))
    .sort((a, b) => b.keyword.length - a.keyword.length);
  return entries.find((e) => lower.includes(e.keyword))?.category;
}

function tryFindVendors(message: string): DetectedIntent | null {
  if (!/\b(find|recommend|source)\b/i.test(message)) return null;
  const lower = message.toLowerCase();
  const category = findVendorCategoryKeyword(lower);
  if (!category && !/\bvendor/i.test(message)) return null;
  return { type: "FIND_VENDORS", category };
}

const REPORT_INTENT_CHECKS: Array<{ type: DetectedIntent["type"]; test: (lower: string) => boolean }> = [
  { type: "SHOW_OVERSPENDING", test: (l) => l.includes("overspend") },
  { type: "SHOW_PENDING_RSVPS", test: (l) => l.includes("pending") && l.includes("rsvp") },
  { type: "SHOW_REMAINING_VENDOR_CATEGORIES", test: (l) => l.includes("remaining") && l.includes("vendor") && l.includes("categor") },
  { type: "SHOW_TRADITIONAL_OUTSTANDING", test: (l) => l.includes("traditional") && l.includes("outstanding") },
  { type: "SHOW_HONEYMOON_TASKS_LEFT", test: (l) => l.includes("honeymoon") && l.includes("task") && (l.includes("left") || l.includes("remain")) },
  { type: "SHOW_DUE_THIS_WEEK", test: (l) => l.includes("due") && l.includes("this week") },
  { type: "SHOW_DEADLINES", test: (l) => l.includes("deadline") },
  { type: "EXPLAIN_HEALTH_SCORE", test: (l) => l.includes("health score") },
];

function tryReportIntent(message: string): DetectedIntent | null {
  const lower = message.toLowerCase();
  const hit = REPORT_INTENT_CHECKS.find((c) => c.test(lower));
  return hit ? ({ type: hit.type } as DetectedIntent) : null;
}

const INTENT_CHECKS: Array<(message: string) => DetectedIntent | null> = [
  tryAddGuest,
  tryAddChecklistItem,
  tryMoveAmount,
  tryReschedule,
  tryAdjustAmount,
  tryMarkAs,
  tryFindVendors,
  tryReportIntent,
];

/** The one Layer-2 export. Falls through to `{ type: "QA", message }`
 *  (the raw text, unchanged) whenever no command pattern matches — that
 *  case is handed to the existing lib/bisaai-qa.ts Q&A engine unchanged,
 *  so an unrecognized command degrades to an informational answer
 *  instead of a dead end. */
export function detectIntent(message: string): DetectedIntent {
  const trimmed = message.trim();
  if (!trimmed) return { type: "QA", message: trimmed };

  for (const check of INTENT_CHECKS) {
    const result = check(trimmed);
    if (result) return result;
  }

  return { type: "QA", message: trimmed };
}
