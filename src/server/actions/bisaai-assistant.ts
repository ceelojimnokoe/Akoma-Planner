// src/server/actions/bisaai-assistant.ts
//
// Layer 3 of BisaAI's three-layer architecture (Layer 1 Chat Interface ->
// Layer 2 Intent Detection [lib/bisaai-intent.ts] -> Layer 3 Application
// Actions [here]). processAssistantMessage is the ONLY export — every
// domain-resolution helper below stays unexported on purpose: Next.js
// auto-exposes every exported function in a "use server" file as an
// independently callable endpoint, and an exported helper would let a
// client skip the Pass-gate check below entirely (same convention as
// vendor-booking.ts's syncVendorBookingStatusMirror/syncCategory and
// traditional-ceremony.ts's syncTraditionalCustomaryBudget).
//
// HARD RULE: several actions this file calls (updateBudgetCategory,
// setVendorBookingProgress, toggleChecklistItem, updateGuestRsvp) are
// deliberately NOT Pass-gated at their own definition, because they're
// free to use via their normal page UI. Calling them from chat without an
// extra check would let a Free user's chat command mutate data — a direct
// violation of "Free must never modify data." This orchestrator is the
// sole enforcement point for chat-triggered mutations: every mutating
// intent, and the two report intents that would otherwise leak Pass-only
// *page* content (Traditional Ceremony, Honeymoon), are gated here before
// any dispatch happens at all.

"use server";

import type { BookingStatus, OnboardingVendorCategory, VendorBookingProgress } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePass } from "@/lib/plan";
import { getWeddingContext, type WeddingContext } from "@/lib/bisaai-context";
import { generateQAAnswer } from "@/lib/bisaai-qa";
import { CRITICAL_VENDOR_CATEGORIES } from "@/lib/bisaai-qa";
import { detectIntent, type AdjustAmountVerb, type AmountField, type DetectedIntent } from "@/lib/bisaai-intent";
import { findBestMatch, type FuzzyMatchable } from "@/lib/fuzzy-match";
import { parseRelativeDate } from "@/lib/date-parsing";
import { formatGHS } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import { getWeddingHealthScore, getHealthScoreSummary } from "@/lib/wedding-health";
import { VENDOR_CATEGORY_LABEL } from "@/lib/vendor-category-labels";
import { matchVendorBudgetCategory, getBudgetFit } from "@/lib/budget-fit";
import { VENDOR_PROGRESS_LABEL } from "@/lib/vendor-booking-progress";
import { ONBOARDING_VENDOR_CATEGORIES } from "@/lib/validation/wedding";
import { TRADITIONAL_CUSTOMARY_BUDGET_NAME } from "@/lib/traditional-ceremony-defaults";
import { updateBudgetCategory, moveBudgetAmount } from "./budget";
import { toggleChecklistItem, updateChecklistItemDueDate, addChecklistItem } from "./checklist";
import { addGuest, updateGuestRsvp } from "./guests";
import { setVendorBookingProgress } from "./vendor-booking";
import { updateTraditionalCeremonyItem } from "./traditional-ceremony";
import { createOrUpdateHoneymoonPlan, updateHoneymoonBudget } from "./honeymoon";

export interface AssistantAnswer {
  answer: string;
  suggestedFollowUps: string[];
}

export type AssistantResponse = { ok: true; data: AssistantAnswer } | { ok: false; error: string };

function reply(answer: string, suggestedFollowUps: string[] = []): AssistantResponse {
  return { ok: true, data: { answer, suggestedFollowUps } };
}

function amountPatch(field: AmountField, value: number): { allocatedGHS: number } | { spentGHS: number } {
  return field === "allocatedGHS" ? { allocatedGHS: value } : { spentGHS: value };
}

function signedPhrase(verb: AdjustAmountVerb, amountGHS: number, preposition: "to" | "from"): string {
  const other = preposition === "to" ? "from" : "to";
  return verb === "increase" ? `Added ${formatGHS(amountGHS)} ${preposition}` : `Removed ${formatGHS(amountGHS)} ${other}`;
}

function clarifyAmbiguousMatch(query: string, kind: string, topMatches: FuzzyMatchable[]): AssistantResponse {
  if (topMatches.length === 0) return reply(`I couldn't find a ${kind} called "${query}".`, []);
  const names = topMatches.map((m) => m.label).join(", ");
  return reply(
    `I found a few possible matches for "${query}": ${names}. Could you be more specific?`,
    topMatches.slice(0, 3).map((m) => `Use ${m.label}`)
  );
}

// ---------------------------------------------------------------------------
// QA passthrough
// ---------------------------------------------------------------------------

function handleQA(message: string, ctx: WeddingContext, priorQuestions: string[]): AssistantResponse {
  const { answer, suggestedFollowUps } = generateQAAnswer(message, ctx, priorQuestions);
  return reply(answer, suggestedFollowUps);
}

// ---------------------------------------------------------------------------
// MARK_AS — vendor-progress words checked first, then RSVP words, then
// completion words (traditional-ceremony item, falling back to checklist).
// ---------------------------------------------------------------------------

const VENDOR_PROGRESS_WORDS: Record<string, VendorBookingProgress> = {
  "not contacted": "NOT_CONTACTED",
  contacted: "ENQUIRY_SENT",
  "enquiry sent": "ENQUIRY_SENT",
  shortlisted: "SHORTLISTED",
  "meeting scheduled": "MEETING_SCHEDULED",
  negotiating: "NEGOTIATING",
  booked: "BOOKED",
  "not selected": "NOT_SELECTED",
};

const RSVP_WORDS: Record<string, "PENDING" | "YES" | "NO"> = {
  accepted: "YES",
  confirmed: "YES",
  yes: "YES",
  attending: "YES",
  declined: "NO",
  no: "NO",
  "not attending": "NO",
  pending: "PENDING",
};

const RSVP_LABEL: Record<"PENDING" | "YES" | "NO", string> = { YES: "Accepted", NO: "Declined", PENDING: "Pending" };

const COMPLETION_WORDS = new Set(["purchased", "acquired", "bought", "done", "complete", "completed"]);

async function handleMarkAs(weddingPlanId: string, intent: Extract<DetectedIntent, { type: "MARK_AS" }>): Promise<AssistantResponse> {
  const { target, statusWord } = intent;

  const vendorProgress = VENDOR_PROGRESS_WORDS[statusWord];
  if (vendorProgress) {
    const vendors = await prisma.vendor.findMany({ select: { id: true, name: true } });
    const { match, topMatches } = findBestMatch(target, vendors.map((v) => ({ id: v.id, label: v.name })));
    if (!match) return clarifyAmbiguousMatch(target, "vendor", topMatches);

    const result = await setVendorBookingProgress(weddingPlanId, match.id, vendorProgress);
    if (!result.ok) {
      if (result.conflict) {
        return reply(
          `${result.conflict.vendorName} is already booked in that category. To replace them, open the vendor's page and use the Replace Vendor option there — I can't confirm that swap from chat yet.`,
          ["Show my remaining vendor categories"]
        );
      }
      return reply(result.error ?? "Couldn't update that vendor's status.", []);
    }
    return reply(`Marked ${match.label} as ${VENDOR_PROGRESS_LABEL[vendorProgress]}.`, ["Show my remaining vendor categories", "How's my budget looking?"]);
  }

  const rsvpStatus = RSVP_WORDS[statusWord];
  if (rsvpStatus) {
    const guests = await prisma.guest.findMany({ where: { weddingPlanId }, select: { id: true, name: true } });
    const { match, topMatches } = findBestMatch(target, guests.map((g) => ({ id: g.id, label: g.name })));
    if (!match) return clarifyAmbiguousMatch(target, "guest", topMatches);

    await updateGuestRsvp(match.id, rsvpStatus);
    return reply(`Marked ${match.label} as ${RSVP_LABEL[rsvpStatus]}.`, ["Show pending guest RSVPs", "What's due this week?"]);
  }

  if (COMPLETION_WORDS.has(statusWord)) {
    const items = await prisma.traditionalCeremonyItem.findMany({
      where: { weddingPlanId },
      select: { id: true, name: true, category: true, allocatedGHS: true },
    });
    const itemMatch = findBestMatch(target, items.map((i) => ({ id: i.id, label: i.name })));
    if (itemMatch.match) {
      await updateTraditionalCeremonyItem({ id: itemMatch.match.id, done: true });
      return reply(`Marked ${itemMatch.match.label} as done.`, ["What traditional items are still outstanding?"]);
    }

    const categoryLabels = [...new Set(items.map((i) => i.category))];
    const categoryMatch = findBestMatch(target, categoryLabels.map((c) => ({ id: c, label: c })));
    if (categoryMatch.match) {
      const itemsInCategory = items.filter((i) => i.category === categoryMatch.match!.label);
      if (itemsInCategory.length === 1) {
        await updateTraditionalCeremonyItem({ id: itemsInCategory[0].id, done: true });
        return reply(`Marked ${itemsInCategory[0].name} as done.`, ["What traditional items are still outstanding?"]);
      }
      if (itemsInCategory.length > 1) {
        const list = itemsInCategory.map((i) => `${i.name} (${formatGHS(i.allocatedGHS)})`).join(", ");
        return reply(
          `"${categoryMatch.match.label}" has a few items — which one? ${list}.`,
          itemsInCategory.slice(0, 3).map((i) => `Mark ${i.name} as purchased`)
        );
      }
    }

    const checklistItems = await prisma.checklistItem.findMany({ where: { weddingPlanId, done: false }, select: { id: true, title: true } });
    const checklistMatch = findBestMatch(target, checklistItems.map((i) => ({ id: i.id, label: i.title })));
    if (checklistMatch.match) {
      await toggleChecklistItem(checklistMatch.match.id, true);
      return reply(`Marked "${checklistMatch.match.label}" as done.`, ["What's due this week?"]);
    }

    return reply(`I couldn't find anything called "${target}" in your traditional items or checklist.`, [
      "What traditional items are still outstanding?",
      "What's due this week?",
    ]);
  }

  return reply(`I'm not sure what "${statusWord}" means here — try a status like booked, shortlisted, accepted, declined, or purchased.`, []);
}

// ---------------------------------------------------------------------------
// ADJUST_AMOUNT — budget categories first, then honeymoon, then
// traditional-ceremony items (by name, falling back to category).
// ---------------------------------------------------------------------------

/** Tries to resolve `target` against this wedding's traditional-ceremony
 *  items (by name, falling back to category) — shared by both of
 *  handleAdjustAmount's two traditional-ceremony checks below. Returns
 *  null (rather than the "couldn't find" message) when nothing matches,
 *  so the caller can fall through to try something else. */
async function resolveTraditionalAdjustment(
  weddingPlanId: string,
  target: string,
  field: AmountField,
  delta: number,
  verb: AdjustAmountVerb,
  amountGHS: number,
  preposition: "to" | "from"
): Promise<AssistantResponse | null> {
  const items = await prisma.traditionalCeremonyItem.findMany({
    where: { weddingPlanId },
    select: { id: true, name: true, category: true, allocatedGHS: true, spentGHS: true },
  });

  const itemMatch = findBestMatch(target, items.map((i) => ({ id: i.id, label: i.name })));
  if (itemMatch.match) {
    const item = items.find((i) => i.id === itemMatch.match!.id)!;
    const currentValue = field === "allocatedGHS" ? item.allocatedGHS : item.spentGHS;
    const nextValue = Math.max(0, currentValue + delta);
    const result = await updateTraditionalCeremonyItem({ id: item.id, ...amountPatch(field, nextValue) });
    if (!result.ok) return reply(result.error ?? "Couldn't update that traditional item.", []);
    return reply(`${signedPhrase(verb, amountGHS, preposition)} ${item.name} — now ${formatGHS(nextValue)}.`, ["What traditional items are still outstanding?"]);
  }

  const categoryLabels = [...new Set(items.map((i) => i.category))];
  const categoryMatch = findBestMatch(target, categoryLabels.map((c) => ({ id: c, label: c })));
  if (categoryMatch.match) {
    const itemsInCategory = items.filter((i) => i.category === categoryMatch.match!.label);
    if (itemsInCategory.length === 1) {
      const item = itemsInCategory[0];
      const currentValue = field === "allocatedGHS" ? item.allocatedGHS : item.spentGHS;
      const nextValue = Math.max(0, currentValue + delta);
      const result = await updateTraditionalCeremonyItem({ id: item.id, ...amountPatch(field, nextValue) });
      if (!result.ok) return reply(result.error ?? "Couldn't update that traditional item.", []);
      return reply(`${signedPhrase(verb, amountGHS, preposition)} ${item.name} — now ${formatGHS(nextValue)}.`, [
        "What traditional items are still outstanding?",
      ]);
    }
    const list = itemsInCategory
      .map((i) => `${i.name} (currently ${formatGHS(field === "allocatedGHS" ? i.allocatedGHS : i.spentGHS)})`)
      .join(", ");
    return reply(
      `"${categoryMatch.match.label}" has a few items — which one did you mean? ${list}.`,
      itemsInCategory.slice(0, 3).map((i) => `Add money to ${i.name}`)
    );
  }

  return null;
}

async function applyBudgetCategoryAdjustment(
  category: { id: string; name: string; allocatedGHS: number; spentGHS: number },
  field: AmountField,
  delta: number,
  verb: AdjustAmountVerb,
  amountGHS: number,
  preposition: "to" | "from"
): Promise<AssistantResponse> {
  const currentValue = field === "allocatedGHS" ? category.allocatedGHS : category.spentGHS;
  const nextValue = Math.max(0, currentValue + delta);
  const result = await updateBudgetCategory({ id: category.id, ...amountPatch(field, nextValue) });
  if (!result.ok) return reply(result.error ?? "Couldn't update that budget category.", []);
  return reply(
    `${signedPhrase(verb, amountGHS, preposition)} ${category.name}'s ${field === "allocatedGHS" ? "allocation" : "spend"} — now ${formatGHS(nextValue)}.`,
    ["How's my budget looking?", "Show me which categories are overspending"]
  );
}

async function handleAdjustAmount(
  weddingPlanId: string,
  intent: Extract<DetectedIntent, { type: "ADJUST_AMOUNT" }>,
  ctx: WeddingContext
): Promise<AssistantResponse> {
  const { target, amountGHS, verb, field } = intent;
  const delta = verb === "increase" ? amountGHS : -amountGHS;
  const preposition = verb === "increase" ? "to" : "from";
  const lowerTarget = target.toLowerCase();

  const budgetMatch = findBestMatch(target, ctx.budget.categories.map((c) => ({ id: c.id, label: c.name })));
  if (budgetMatch.match) {
    const category = ctx.budget.categories.find((c) => c.id === budgetMatch.match!.id)!;

    // The "Traditional Customary" rollup category (lib/traditional-
    // ceremony-defaults.ts) shares the word "traditional" — and often
    // "customary" — with almost any traditional-ceremony phrase, so a
    // merely coincidental, non-exact/non-substring match against it
    // (score < 50, i.e. word-overlap only) is more likely a mis-fire
    // than the couple's real intent — "Add GHS 500 to traditional gifts"
    // should land on the "Gifts for the Family" item, not this
    // whole-envelope category. A strong match (typed the name itself, or
    // a real substring of it) still wins immediately below, unaffected.
    const isWeakTraditionalCustomaryMatch = category.name === TRADITIONAL_CUSTOMARY_BUDGET_NAME && budgetMatch.score < 50;
    if (!isWeakTraditionalCustomaryMatch) {
      return applyBudgetCategoryAdjustment(category, field, delta, verb, amountGHS, preposition);
    }

    const traditionalResult = await resolveTraditionalAdjustment(weddingPlanId, target, field, delta, verb, amountGHS, preposition);
    if (traditionalResult) return traditionalResult;

    // No better traditional item/category match exists either — fall
    // back to the weak-but-only budget-category match rather than a dead end.
    return applyBudgetCategoryAdjustment(category, field, delta, verb, amountGHS, preposition);
  }

  if (lowerTarget.includes("honeymoon")) {
    if (!ctx.honeymoon.isSetUp) {
      const nextValue = Math.max(0, delta);
      const result = await createOrUpdateHoneymoonPlan({ weddingPlanId, styles: [], allocatedGHS: nextValue });
      if (!result.ok) return reply(result.error ?? "Couldn't set up your honeymoon budget.", []);
      return reply(`Set up your honeymoon plan with a budget of ${formatGHS(nextValue)}.`, ["Help plan my honeymoon", "What honeymoon tasks are left?"]);
    }
    const currentValue = field === "allocatedGHS" ? ctx.honeymoon.allocatedGHS : ctx.honeymoon.spentGHS;
    const nextValue = Math.max(0, currentValue + delta);
    const result = await updateHoneymoonBudget({ weddingPlanId, ...amountPatch(field, nextValue) });
    if (!result.ok) return reply(result.error ?? "Couldn't update your honeymoon budget.", []);
    return reply(`${signedPhrase(verb, amountGHS, preposition)} your honeymoon budget — now ${formatGHS(nextValue)}.`, [
      "What honeymoon tasks are left?",
      "How's my budget looking?",
    ]);
  }

  const traditionalResult = await resolveTraditionalAdjustment(weddingPlanId, target, field, delta, verb, amountGHS, preposition);
  if (traditionalResult) return traditionalResult;

  return reply(`I couldn't find a budget category or item called "${target}".`, ["How's my budget looking?", "What traditional items are still outstanding?"]);
}

// ---------------------------------------------------------------------------
// MOVE_AMOUNT — budget categories only.
// ---------------------------------------------------------------------------

async function handleMoveAmount(
  weddingPlanId: string,
  intent: Extract<DetectedIntent, { type: "MOVE_AMOUNT" }>,
  ctx: WeddingContext
): Promise<AssistantResponse> {
  const candidates = ctx.budget.categories.map((c) => ({ id: c.id, label: c.name }));

  const sourceMatch = findBestMatch(intent.source, candidates);
  if (!sourceMatch.match) return clarifyAmbiguousMatch(intent.source, "budget category", sourceMatch.topMatches);

  const destMatch = findBestMatch(intent.dest, candidates);
  if (!destMatch.match) return clarifyAmbiguousMatch(intent.dest, "budget category", destMatch.topMatches);

  const result = await moveBudgetAmount(weddingPlanId, sourceMatch.match.id, destMatch.match.id, intent.amountGHS);
  if (!result.ok) return reply(result.error ?? "Couldn't move that budget.", []);
  return reply(`Moved ${formatGHS(intent.amountGHS)} from ${sourceMatch.match.label} to ${destMatch.match.label}.`, [
    "How's my budget looking?",
    "Show me which categories are overspending",
  ]);
}

// ---------------------------------------------------------------------------
// ADD_CHECKLIST_ITEM / ADD_GUEST
// ---------------------------------------------------------------------------

async function handleAddChecklistItem(weddingPlanId: string, intent: Extract<DetectedIntent, { type: "ADD_CHECKLIST_ITEM" }>): Promise<AssistantResponse> {
  const result = await addChecklistItem({ weddingPlanId, title: intent.title, category: "Custom" });
  if (!result.ok) return reply(result.error ?? "Couldn't add that task.", []);
  return reply(`Added "${intent.title}" to your checklist.`, ["What's due this week?", "Show upcoming deadlines"]);
}

async function handleAddGuest(weddingPlanId: string, intent: Extract<DetectedIntent, { type: "ADD_GUEST" }>): Promise<AssistantResponse> {
  const result = await addGuest({ weddingPlanId, name: intent.name, side: intent.side });
  if (!result.ok) return reply(result.error ?? "Couldn't add that guest.", []);
  const sideLabel = intent.side === "BOTH" ? "shared" : intent.side.toLowerCase();
  return reply(`Added ${intent.name} as a ${sideLabel} guest.`, ["Show pending guest RSVPs", "How's my budget looking?"]);
}

// ---------------------------------------------------------------------------
// FIND_VENDORS — free tier.
// ---------------------------------------------------------------------------

async function handleFindVendors(intent: Extract<DetectedIntent, { type: "FIND_VENDORS" }>, ctx: WeddingContext): Promise<AssistantResponse> {
  const vendors = await prisma.vendor.findMany({
    where: intent.category ? { category: intent.category } : undefined,
    orderBy: { rating: "desc" },
    take: 20,
  });

  const withinBudget = vendors
    .map((v) => {
      const matched = matchVendorBudgetCategory(v.category, ctx.budget.categories);
      const fit = matched ? getBudgetFit(v.priceLowGHS, matched) : null;
      return { vendor: v, fit };
    })
    .filter((v) => !v.fit || v.fit.fits)
    .slice(0, 5);

  const categoryLabel = intent.category ? VENDOR_CATEGORY_LABEL[intent.category] : null;

  if (withinBudget.length === 0) {
    return reply(
      categoryLabel
        ? `I couldn't find any ${categoryLabel} vendors within your allocated budget — try browsing /vendors for the full list.`
        : "I couldn't find vendors within your allocated budget right now — try browsing the full vendor list instead.",
      ["Show my remaining vendor categories", "How's my budget looking?"]
    );
  }

  const lines = withinBudget.map(({ vendor }) => `${vendor.name} (${formatGHS(vendor.priceLowGHS)}–${formatGHS(vendor.priceHighGHS)})`).join(", ");
  const intro = categoryLabel ? `Within budget for ${categoryLabel}` : "Vendors within your allocated budget";
  return reply(`${intro}: ${lines}.`, ["Show my remaining vendor categories", "Mark one of these as shortlisted"]);
}

// ---------------------------------------------------------------------------
// RESCHEDULE — checklist items only (ChecklistItem.dueDate powers /calendar).
// ---------------------------------------------------------------------------

async function handleReschedule(weddingPlanId: string, intent: Extract<DetectedIntent, { type: "RESCHEDULE" }>): Promise<AssistantResponse> {
  const newDate = parseRelativeDate(intent.whenPhrase);
  if (!newDate) {
    return reply(`I couldn't understand the date "${intent.whenPhrase}". Try something like "tomorrow", "next Saturday", or "in 3 days".`, []);
  }

  const items = await prisma.checklistItem.findMany({ where: { weddingPlanId, done: false }, select: { id: true, title: true } });
  const { match, topMatches } = findBestMatch(intent.target, items.map((i) => ({ id: i.id, label: i.title })));
  if (!match) return clarifyAmbiguousMatch(intent.target, "checklist task", topMatches);

  await updateChecklistItemDueDate(match.id, newDate);
  return reply(`Moved "${match.label}" to ${formatDate(newDate)}.`, ["What's due this week?", "Show upcoming deadlines"]);
}

// ---------------------------------------------------------------------------
// Report intents — read-only, formatted straight from real data.
// ---------------------------------------------------------------------------

function handleShowOverspending(ctx: WeddingContext): AssistantResponse {
  const over = ctx.budget.categories.filter((c) => c.isOverBudget);
  if (over.length === 0) return reply("Nothing is over budget right now — every category is within its allocation.", ["How's my budget looking overall?"]);
  const lines = over.map((c) => `${c.name} (over by ${formatGHS(c.spentGHS - c.allocatedGHS)})`).join(", ");
  return reply(`Over budget in ${over.length} categor${over.length === 1 ? "y" : "ies"}: ${lines}.`, [
    "Move budget into one of these categories",
    "Show my remaining vendor categories",
  ]);
}

async function handleShowPendingRsvps(weddingPlanId: string, ctx: WeddingContext): Promise<AssistantResponse> {
  const pending = await prisma.guest.findMany({
    where: { weddingPlanId, rsvpStatus: "PENDING" },
    select: { name: true },
    orderBy: { createdAt: "asc" },
    take: 15,
  });
  if (pending.length === 0) return reply("No pending RSVPs — everyone on your list has responded.", ["How's my budget looking?"]);
  const names = pending.map((g) => g.name).join(", ");
  const more = ctx.guests.pendingRecords > pending.length ? `, and ${ctx.guests.pendingRecords - pending.length} more` : "";
  return reply(`${ctx.guests.pendingRecords} guest${ctx.guests.pendingRecords === 1 ? "" : "s"} still pending: ${names}${more}.`, [
    "Mark one of these as accepted",
    "Show my remaining vendor categories",
  ]);
}

function handleShowRemainingVendorCategories(ctx: WeddingContext): AssistantResponse {
  const bookedCategories = new Set(
    (Object.entries(ctx.vendors.byCategory) as [OnboardingVendorCategory, BookingStatus][])
      .filter(([, status]) => status === "BOOKED")
      .map(([category]) => category)
  );
  const remaining = ONBOARDING_VENDOR_CATEGORIES.filter((c) => !bookedCategories.has(c.value as OnboardingVendorCategory)).map((c) => c.label);
  if (remaining.length === 0) return reply("Every vendor category is booked — nothing remaining there.", ["How's my budget looking?"]);
  return reply(`Still to book: ${remaining.join(", ")}.`, ["Recommend vendors within budget", "What's due this week?"]);
}

async function handleShowTraditionalOutstanding(weddingPlanId: string): Promise<AssistantResponse> {
  const items = await prisma.traditionalCeremonyItem.findMany({ where: { weddingPlanId, done: false }, orderBy: { createdAt: "asc" } });
  if (items.length === 0) return reply("Nothing outstanding — every traditional item is marked done.", ["What should I focus on this week?"]);
  const lines = items.map((i) => `${i.name} (${formatGHS(i.allocatedGHS)})`).join(", ");
  return reply(`Still outstanding: ${lines}.`, ["Mark one of these as purchased", "Add more budget to one of these"]);
}

async function handleShowHoneymoonTasksLeft(weddingPlanId: string): Promise<AssistantResponse> {
  const items = await prisma.honeymoonChecklistItem.findMany({ where: { weddingPlanId, done: false }, orderBy: { createdAt: "asc" } });
  if (items.length === 0) return reply("Nothing left — your honeymoon checklist is fully done.", ["How's my budget looking?"]);
  const titles = items.map((i) => i.title).join(", ");
  return reply(`Honeymoon tasks left: ${titles}.`, ["Increase my honeymoon budget", "What's due this week?"]);
}

async function handleShowDueThisWeek(weddingPlanId: string): Promise<AssistantResponse> {
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const items = await prisma.checklistItem.findMany({
    where: { weddingPlanId, done: false, dueDate: { gte: now, lt: weekEnd } },
    orderBy: { dueDate: "asc" },
  });
  if (items.length === 0) return reply("Nothing due in the next 7 days — you're clear for the moment.", ["Show upcoming deadlines"]);
  const lines = items.map((i) => `${i.title} (${formatDate(i.dueDate!)})`).join(", ");
  return reply(`Due this week: ${lines}.`, ["Show upcoming deadlines", "Mark one of these as done"]);
}

async function handleShowDeadlines(weddingPlanId: string): Promise<AssistantResponse> {
  const items = await prisma.checklistItem.findMany({
    where: { weddingPlanId, done: false, dueDate: { not: null } },
    orderBy: { dueDate: "asc" },
    take: 5,
  });
  if (items.length === 0) return reply("No upcoming deadlines — every dated task is either done or has no due date set.", ["What should I focus on this week?"]);
  const lines = items.map((i) => `${i.title} — ${formatDate(i.dueDate!)}`).join(", ");
  return reply(`Your next deadlines: ${lines}.`, ["What's due this week?", "Mark one of these as done"]);
}

async function handleExplainHealthScore(ctx: WeddingContext, weddingPlanId: string): Promise<AssistantResponse> {
  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: weddingPlanId }, select: { createdAt: true } });

  const bookedCategories = new Set(
    (Object.entries(ctx.vendors.byCategory) as [OnboardingVendorCategory, BookingStatus][])
      .filter(([, status]) => status === "BOOKED")
      .map(([category]) => category)
  );
  const criticalCategorySet = new Set<string>(CRITICAL_VENDOR_CATEGORIES);
  const unbookedCategoryLabels = [
    ...ONBOARDING_VENDOR_CATEGORIES.filter((c) => criticalCategorySet.has(c.value) && !bookedCategories.has(c.value as OnboardingVendorCategory)),
    ...ONBOARDING_VENDOR_CATEGORIES.filter((c) => !criticalCategorySet.has(c.value) && !bookedCategories.has(c.value as OnboardingVendorCategory)),
  ].map((c) => c.label);
  const bookedCriticalCategoryLabel = ONBOARDING_VENDOR_CATEGORIES.find(
    (c) => criticalCategorySet.has(c.value) && bookedCategories.has(c.value as OnboardingVendorCategory)
  )?.label;

  const health = getWeddingHealthScore({
    checklistPercent: ctx.checklist.percent,
    weddingPlanCreatedAt: weddingPlan.createdAt,
    weddingDate: ctx.weddingDate,
    budgetPercentSpent: ctx.budget.percentSpent,
    budgetRemainingGHS: ctx.budget.remainingGHS,
    vendorsBookedCount: ctx.vendors.bookedCount,
    vendorsTotalCount: ctx.vendors.totalCount,
    guestsConfirmedAttendees: ctx.guests.confirmedAttendees,
    guestsTotalAttendees: ctx.guests.totalAttendees,
  });

  const summary = getHealthScoreSummary(health, { unbookedCategoryLabels, bookedCriticalCategoryLabel });
  const parts = [`Your Wedding Health Score is ${health.score}/100 (${health.statusLabel}).`];
  if (summary.completed.length) parts.push(`What's going well: ${summary.completed.join("; ")}.`);
  if (summary.improve.length) parts.push(`Where to focus: ${summary.improve.join("; ")}.`);

  return reply(parts.join(" "), ["What should I focus on this week?", "How's my budget looking?", "Show my remaining vendor categories"]);
}

// ---------------------------------------------------------------------------
// The orchestrator.
// ---------------------------------------------------------------------------

const MUTATING_TYPES = new Set<DetectedIntent["type"]>([
  "MARK_AS",
  "ADJUST_AMOUNT",
  "MOVE_AMOUNT",
  "ADD_CHECKLIST_ITEM",
  "ADD_GUEST",
  "RESCHEDULE",
]);

// Traditional Ceremony and Honeymoon are whole Pass-gated *pages*, not
// just their mutations (see traditional-ceremony/page.tsx and
// honeymoon/page.tsx's own requirePass calls) — these two report intents
// would otherwise leak that Pass-only content to a Free user, since
// getWeddingContext() fetches it unconditionally regardless of plan tier.
const PASS_ONLY_REPORT_TYPES = new Set<DetectedIntent["type"]>(["SHOW_TRADITIONAL_OUTSTANDING", "SHOW_HONEYMOON_TASKS_LEFT"]);

/**
 * The one Layer-3 export, and the one place a Wedding Pass check happens
 * for anything BisaAI chat could do. Free and Pass both reach here; the
 * gate below is what makes the difference real rather than cosmetic.
 */
export async function processAssistantMessage(
  weddingPlanId: string,
  message: string,
  priorQuestions: string[] = []
): Promise<AssistantResponse> {
  const trimmed = message.trim();
  if (!trimmed) return { ok: false, error: "Ask BisaAI something first." };

  const intent = detectIntent(trimmed);

  if (MUTATING_TYPES.has(intent.type) || PASS_ONLY_REPORT_TYPES.has(intent.type)) {
    const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: weddingPlanId }, select: { hasWeddingPass: true } });
    const gate = requirePass(weddingPlan, "BisaAI actions");
    if (!gate.allowed) return reply(gate.upgradeReason, []);
  }

  const ctx = await getWeddingContext(weddingPlanId);

  switch (intent.type) {
    case "QA":
      return handleQA(intent.message, ctx, priorQuestions);
    case "MARK_AS":
      return handleMarkAs(weddingPlanId, intent);
    case "ADJUST_AMOUNT":
      return handleAdjustAmount(weddingPlanId, intent, ctx);
    case "MOVE_AMOUNT":
      return handleMoveAmount(weddingPlanId, intent, ctx);
    case "ADD_CHECKLIST_ITEM":
      return handleAddChecklistItem(weddingPlanId, intent);
    case "ADD_GUEST":
      return handleAddGuest(weddingPlanId, intent);
    case "FIND_VENDORS":
      return handleFindVendors(intent, ctx);
    case "RESCHEDULE":
      return handleReschedule(weddingPlanId, intent);
    case "SHOW_OVERSPENDING":
      return handleShowOverspending(ctx);
    case "SHOW_PENDING_RSVPS":
      return handleShowPendingRsvps(weddingPlanId, ctx);
    case "SHOW_REMAINING_VENDOR_CATEGORIES":
      return handleShowRemainingVendorCategories(ctx);
    case "SHOW_TRADITIONAL_OUTSTANDING":
      return handleShowTraditionalOutstanding(weddingPlanId);
    case "SHOW_HONEYMOON_TASKS_LEFT":
      return handleShowHoneymoonTasksLeft(weddingPlanId);
    case "SHOW_DUE_THIS_WEEK":
      return handleShowDueThisWeek(weddingPlanId);
    case "SHOW_DEADLINES":
      return handleShowDeadlines(weddingPlanId);
    case "EXPLAIN_HEALTH_SCORE":
      return handleExplainHealthScore(ctx, weddingPlanId);
  }
}
