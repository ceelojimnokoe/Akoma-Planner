// src/lib/bisaai-qa.ts
//
// The actual "smart without an API" logic: pure functions that turn a
// WeddingContext (lib/bisaai-context.ts) into a real, personalized answer
// or a set of proactive nudges. Kept separate from lib/bisaai.ts (which
// only fetches context, calls into here, and logs) the same way
// lib/budget.ts and lib/guests.ts stay pure and let their caller fetch
// data — no Prisma import anywhere in this file, which is what makes it
// fully unit-testable against a hand-built WeddingContext fixture (see
// tests/bisaai-qa.test.ts) without a database.
//
// REAL INTEGRATION TODO (matches every other function's convention in
// lib/bisaai.ts): a real LLM call would replace generateQAAnswer's body
// with a prompt built from `ctx` (as grounding/system context) and
// `priorQuestions` (as conversation history) — the function signature
// and return shape wouldn't need to change, since the caller (basicQA in
// lib/bisaai.ts) already assembles exactly that input for this file.

import { formatGHS } from "./currency";
import type { WeddingContext, VendorInterestSummary } from "./bisaai-context";
import { matchVendorBudgetCategory } from "./budget-fit";
import type { OnboardingVendorCategory, VendorBookingProgress } from "@prisma/client";

function humanize(category: string): string {
  return category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, " ");
}

function weeksAway(days: number): string {
  const weeks = Math.round(days / 7);
  return weeks <= 1 ? "about a week" : `about ${weeks} weeks`;
}

function monthsAway(days: number): string {
  const months = Math.round(days / 30);
  if (months <= 0) return "less than a month";
  return months === 1 ? "about a month" : `about ${months} months`;
}

interface QATopic {
  id: string;
  keywords: string[];
  angles: Array<(ctx: WeddingContext) => string>;
  followUps: string[];
}

const TOPICS: QATopic[] = [
  {
    id: "budget",
    keywords: ["budget", "how much", "afford", "spending", "overspend", "expensive"],
    angles: [
      (ctx) => {
        const over = ctx.budget.categories.filter((c) => c.isOverBudget);
        const overNote = over.length
          ? ` ${over.length === 1 ? "One category is" : `${over.length} categories are`} already over its allocation: ${over.map((c) => c.name).join(", ")}.`
          : " Nothing is over budget yet — nice work.";
        return `You've spent ${formatGHS(ctx.budget.totalSpentGHS)} of your ${formatGHS(ctx.budget.totalBudgetGHS)} budget (${Math.round(ctx.budget.percentSpent)}%), with ${monthsAway(ctx.daysUntil)} left to go.${overNote}`;
      },
      (ctx) =>
        `A common starting split for a Ghanaian wedding budget is roughly 25% venue, 20% catering, 15% attire, 15% traditional rites, and the rest split across photography, decor, music and miscellaneous. You've allocated ${formatGHS(ctx.budget.totalAllocatedGHS)} of your ${formatGHS(ctx.budget.totalBudgetGHS)} total so far — the Budget tool can show you exactly where that stands category by category.`,
      (ctx) =>
        `With ${formatGHS(ctx.budget.remainingGHS)} left unspent and ${monthsAway(ctx.daysUntil)} until the big day, this is a good time to lock in quotes for anything still unbooked — prices tend to firm up (and go up) as vendors' calendars fill in.`,
    ],
    followUps: ["Which category is over budget?", "Give me a cost-saving tip", "What should I focus on this week?"],
  },
  {
    id: "cost-saving",
    keywords: ["save money", "cheap", "affordable", "discount", "cut cost", "cost-saving", "budget-friendly", "cost saving"],
    angles: [
      () =>
        "Three places couples usually find real savings: (1) trim the catering headcount buffer — caterers often quote for 10-15% more than confirmed RSVPs out of habit, not need; (2) rent or borrow decor pieces (arches, lanterns, table linens) instead of buying new; (3) bundle vendors where you can — a photographer/videographer duo or a DJ/MC combo is almost always cheaper than booking separately.",
      () =>
        "Attire is an easy one: a made-to-measure kente or agbada from a local tailor is often both cheaper and more personal than an imported option, and rental is increasingly normal for groomsmen/bridesmaid sets that will only be worn once.",
      (ctx) =>
        `Negotiate as a package, not line-by-line — vendors will often move more on a bundled quote than on any single item. With ${formatGHS(ctx.budget.remainingGHS)} still unspent, it's worth getting two or three competing quotes before you commit to anything big.`,
    ],
    followUps: ["How's my budget looking?", "Any vendors I still need to book?", "What are common wedding mistakes to avoid?"],
  },
  {
    id: "timeline",
    keywords: ["timeline", "when should", "how early", "planning schedule", "milestone"],
    angles: [
      (ctx) =>
        `As a rough guide: lock the date and budget 12 months out, book venue/photographer/caterer 5-6 months out, sort attire 3-5 months out, send invitations 2 months out, and confirm final headcounts and logistics in the last 2 weeks. You're ${ctx.checklist.percent}% through your checklist with ${monthsAway(ctx.daysUntil)} to go — your Checklist tab has this laid out against your actual wedding date.`,
      (ctx) =>
        ctx.checklist.overdueCount > 0
          ? `You have ${ctx.checklist.overdueCount} checklist task${ctx.checklist.overdueCount === 1 ? "" : "s"} past its due date — worth clearing those first before adding anything new to the list.`
          : `You're not behind on anything right now — ${ctx.checklist.upcomingCount} task${ctx.checklist.upcomingCount === 1 ? "" : "s"} still ahead of you, none of it overdue.`,
    ],
    followUps: ["What should I focus on this week?", "Am I ahead or behind schedule?", "Give me a cost-saving tip"],
  },
  {
    id: "vendors",
    keywords: ["vendor", "photographer", "videographer", "caterer", "florist", "dj", "makeup artist", "recommend"],
    angles: [
      (ctx) => {
        const unbooked = Object.entries(ctx.vendors.byCategory)
          .filter(([, status]) => status !== "BOOKED")
          .map(([category]) => humanize(category));
        return unbooked.length
          ? `You've booked ${ctx.vendors.bookedCount} of ${ctx.vendors.totalCount} vendor categories. Still open: ${unbooked.slice(0, 4).join(", ")}${unbooked.length > 4 ? ", and more" : ""} — BisaAI's vendor sourcing tool can rank real local options by category and city.`
          : `All ${ctx.vendors.totalCount} of your tracked vendor categories are booked — you're in great shape there.`;
      },
      () =>
        "When comparing vendors, ask each one the same three questions so you're comparing like-for-like: what's included in the base price, what happens if the date needs to shift, and how far in advance they need final numbers. That alone filters out a lot of mismatched quotes.",
    ],
    followUps: ["Any vendors I still need to book?", "How's my budget looking?", "Give me wedding etiquette advice"],
  },
  {
    id: "guests",
    keywords: ["guest list", "manage guest", "how many guests", "invite list", "invitation list"],
    angles: [
      (ctx) =>
        `You've estimated ${ctx.guestEstimate} guests and have ${ctx.guests.totalRecords} on your list so far (${ctx.guests.totalAttendees} attendees counting plus-ones). ${ctx.guests.totalRecords === 0 ? "Worth starting the list early — it feeds your seating and catering numbers later." : "The Guest List tab tracks RSVP status by side as replies come in."}`,
      () =>
        "For Ghanaian weddings, it's common for actual attendance to run 10-20% over RSVP'd numbers, especially on the traditional side — worth briefing your caterer with a buffer for this rather than being caught out on the day.",
    ],
    followUps: ["How are my RSVPs going?", "Give me seating suggestions", "What's common wedding etiquette here?"],
  },
  {
    id: "rsvp",
    keywords: ["rsvp", "response", "confirm attendance", "accepted", "declined", "who's coming"],
    angles: [
      (ctx) => {
        const { confirmedAttendees, pendingAttendees, totalAttendees } = ctx.guests;
        if (totalAttendees === 0) {
          return "No guests on your list yet, so nothing to report on RSVPs — add your list first and this'll have real numbers to work with.";
        }
        const pendingNote =
          pendingAttendees > 0
            ? ` Since your wedding is ${monthsAway(ctx.daysUntil)} away, ${ctx.daysUntil < 90 ? "now would be a good time to follow up with pending RSVPs." : "you still have some runway, but it's worth a gentle nudge soon."}`
            : " Everyone's responded — nothing to chase.";
        return `You currently have ${totalAttendees} guests planned, but only ${confirmedAttendees} have accepted so far (${pendingAttendees} still pending).${pendingNote}`;
      },
      (ctx) =>
        ctx.guests.declinedAttendees > 0
          ? `${ctx.guests.declinedAttendees} guest${ctx.guests.declinedAttendees === 1 ? " has" : "s have"} declined so far — worth revisiting your seating and catering counts once RSVPs settle so you're not paying for no-shows.`
          : "No declines yet. Once RSVPs start settling, revisit your seating chart and catering headcount against confirmed numbers rather than your original estimate.",
    ],
    followUps: ["Give me seating suggestions", "How's my budget looking?", "What should I focus on this week?"],
  },
  {
    id: "seating",
    keywords: ["seating", "seat", "table plan", "table arrangement", "who sits where"],
    angles: [
      (ctx) => {
        const confirmed = ctx.guests.confirmedAttendees;
        const tables = confirmed > 0 ? Math.ceil(confirmed / 10) : 0;
        return confirmed > 0
          ? `With ${confirmed} confirmed attendees, that's roughly ${tables} tables at 10 seats each. Design Tools has a seating-suggestion generator that groups your confirmed guests automatically — worth a look once more RSVPs are in.`
          : "Seating suggestions work best once you have confirmed RSVPs to work from — right now nothing's confirmed yet, so start there first.";
      },
      () =>
        "A few rules of thumb: seat families and existing friend groups together rather than mixing strangers, keep the two families balanced across the room rather than split down the middle, and always leave 1-2 spare seats per table for last-minute plus-ones.",
    ],
    followUps: ["How are my RSVPs going?", "Any vendors I still need to book?", "Give me wedding etiquette advice"],
  },
  {
    id: "etiquette",
    keywords: ["etiquette", "who pays", "thank you note", "plus one policy", "invitation wording", "dress code"],
    angles: [
      () =>
        "A few common etiquette points: send thank-you notes within about 3 months after the wedding, be explicit about plus-one policy on the invitation itself (don't leave it ambiguous), and if families are contributing financially, agree who covers what in writing early — it avoids awkward surprises later.",
      () =>
        "For a two-part Ghanaian wedding (traditional + white wedding), it's normal — and appreciated — to send separate invitations or at least clearly separate details for each event, since not every guest attends both.",
    ],
    followUps: ["What's the usual traditional ceremony order?", "What are common wedding mistakes to avoid?", "How's my budget looking?"],
  },
  {
    id: "priorities",
    keywords: ["priorit", "what should i do", "what's next", "where do i start", "focus on"],
    angles: [
      (ctx) => {
        if (ctx.checklist.overdueCount > 0) {
          return `Start with your ${ctx.checklist.overdueCount} overdue checklist task${ctx.checklist.overdueCount === 1 ? "" : "s"} — clearing those first keeps everything downstream from slipping too. After that, your Checklist tab's "This week's focus" has the rest sorted by priority.`;
        }
        const unbooked = Object.values(ctx.vendors.byCategory).filter((s) => s !== "BOOKED").length;
        if (unbooked > 0 && ctx.daysUntil < 120) {
          return `Nothing's overdue, which is great — the biggest open item right now is ${unbooked} unbooked vendor categor${unbooked === 1 ? "y" : "ies"} with ${monthsAway(ctx.daysUntil)} left. That's worth top priority before it becomes a scramble.`;
        }
        return `You're in good shape — ${ctx.checklist.percent}% through your checklist with nothing overdue. Keep an eye on RSVPs as they come in over the next while.`;
      },
    ],
    followUps: ["What should I do this week?", "Any vendors I still need to book?", "How's my budget looking?"],
  },
  {
    id: "mistakes",
    keywords: ["mistake", "avoid", "pitfall", "common error", "what not to do"],
    angles: [
      () =>
        "Three mistakes that come up a lot: booking a venue before the guest count is even roughly set (leads to a space that's too small or absurdly oversized), not getting quotes in writing (verbal agreements are hard to hold vendors to later), and underestimating the traditional-side guest count separately from the white wedding.",
      () =>
        "Another common one: leaving RSVP follow-up too late. Caterers and venues need firm numbers well before the day, so chasing pending responses in the final week puts everyone downstream under pressure that was avoidable weeks earlier.",
    ],
    followUps: ["How are my RSVPs going?", "Give me a cost-saving tip", "What should I focus on this week?"],
  },
  {
    id: "weekly",
    keywords: ["this week", "weekly", "what should i do this week", "week's focus"],
    angles: [
      (ctx) => {
        if (ctx.checklist.overdueCount > 0) {
          return `This week: clear your ${ctx.checklist.overdueCount} overdue task${ctx.checklist.overdueCount === 1 ? "" : "s"} first — everything else can wait a few more days, but overdue items tend to compound.`;
        }
        if (ctx.guests.pendingAttendees > 10) {
          return `This week: follow up on the ${ctx.guests.pendingAttendees} pending RSVPs — a short reminder message now saves a stressful scramble closer to the date.`;
        }
        return `This week: nothing urgent is outstanding — a good moment to get ahead on something further out on your checklist rather than coast, since you have ${monthsAway(ctx.daysUntil)} left.`;
      },
    ],
    followUps: ["What should I focus on overall?", "How's my budget looking?", "Am I ahead or behind schedule?"],
  },
  {
    id: "traditional",
    keywords: ["traditional", "engagement ceremony", "knocking", "bride price", "okyeame", "linguist"],
    angles: [
      (ctx) =>
        `Most ${ctx.style.tradition || "Akan"} traditional/engagement ceremonies follow: family arrival and greetings, introductions through the linguist (okyeame), presentation of the bride-price list, the bride is "found" and presented, a blessing, then a shared meal. Exact order and items vary by ethnic group and family — the Traditional List tool has estimated item costs if that's what you're after.`,
    ],
    followUps: ["What's the usual budget split for this?", "Give me wedding etiquette advice", "What are common wedding mistakes to avoid?"],
  },
  {
    id: "honeymoon",
    keywords: ["honeymoon", "post-wedding trip", "getaway"],
    angles: [
      (ctx) =>
        ctx.honeymoon.isSetUp
          ? `You've allocated ${formatGHS(ctx.honeymoon.allocatedGHS)} for your honeymoon and spent ${formatGHS(ctx.honeymoon.spentGHS)} so far. The Honeymoon Planner tracks your destination, style and a dedicated checklist completely separate from your main wedding budget.`
          : "You haven't set up a honeymoon plan yet — the Honeymoon Planner tracks a destination, budget, and checklist completely separate from your main wedding budget, so it won't eat into your venue/catering/decor allocations.",
      () =>
        "A few honeymoon-planning tips: book flights and major accommodation 2-3 months out for better rates, keep a light first day or two after the wedding rather than an ambitious itinerary right away, and check passport/visa validity early if you're travelling internationally.",
    ],
    followUps: ["How's my budget looking?", "What should I focus on this week?", "Give me a cost-saving tip"],
  },
];

// The 8 clickable Quick Actions shown before the user types anything —
// replaces a blank chat window (see ChatPanel/FloatingChatBubble's
// showStarters). Deliberately a separate export from getStarterPrompts()
// below rather than a replacement of it: STARTER_PROMPTS' plain-text
// content is still relied on by generateQAAnswer's own fallback
// suggestedFollowUps (see FALLBACK_ANSWER handling), and by
// tests/bisaai-qa.test.ts's assertion that those follow-ups are a subset
// of getStarterPrompts() — reusing it for a visually distinct,
// emoji-prefixed button set would break that invariant for no benefit.
// Each one is verified (see tests/bisaai-intent.test.ts) to route through
// detectIntent to a real, useful first response.
const QUICK_ACTIONS = [
  "💰 Help me allocate my budget",
  "📋 What's due this week?",
  "👥 Show pending guest RSVPs",
  "🏛️ Plan my traditional ceremony",
  "🛍️ Recommend vendors within budget",
  "🤖 Explain my Wedding Health Score",
  "✈️ Help plan my honeymoon",
  "📅 Show upcoming deadlines",
];

export function getQuickActions(): string[] {
  return QUICK_ACTIONS;
}

const STARTER_PROMPTS = [
  "How's my budget looking?",
  "What should I focus on this week?",
  "Give me a cost-saving tip",
  "How are my RSVPs going?",
  "Any vendors I still need to book?",
  "What are common wedding mistakes to avoid?",
];

const FALLBACK_ANSWER =
  "I don't have a prepared answer for that one yet — BisaAI's Q&A runs on a curated knowledge base rather than a full language model. Try asking about budget, timelines, vendors, guests, RSVPs, seating, etiquette, cost-saving, priorities, or common mistakes, or pick one of the suggestions below.";

function matchTopic(question: string): QATopic | null {
  const lower = question.trim().toLowerCase();
  return TOPICS.find((t) => t.keywords.some((kw) => lower.includes(kw))) ?? null;
}

export interface QAAnswer {
  answer: string;
  topic: string;
  suggestedFollowUps: string[];
}

/** Turns a question + real wedding data into a grounded answer. Picks a
 *  different "angle" for a repeated topic (via `priorQuestions`, the
 *  client's own recent message history — no server-side session needed)
 *  so asking the same thing twice doesn't read back verbatim. */
export function generateQAAnswer(question: string, ctx: WeddingContext, priorQuestions: string[] = []): QAAnswer {
  const topic = matchTopic(question);
  if (!topic) {
    return { answer: FALLBACK_ANSWER, topic: "fallback", suggestedFollowUps: STARTER_PROMPTS.slice(0, 3) };
  }
  const timesAskedBefore = priorQuestions.filter((pq) => matchTopic(pq)?.id === topic.id).length;
  const angle = topic.angles[timesAskedBefore % topic.angles.length];
  return { answer: angle(ctx), topic: topic.id, suggestedFollowUps: topic.followUps };
}

export function getStarterPrompts(): string[] {
  return STARTER_PROMPTS;
}

export interface ProactiveSuggestion {
  id: string;
  message: string;
  severity: "warning" | "info" | "positive";
  actionLabel?: string;
  actionHref?: string;
}

const SEVERITY_RANK: Record<ProactiveSuggestion["severity"], number> = { warning: 0, info: 1, positive: 2 };

export const CRITICAL_VENDOR_CATEGORIES: OnboardingVendorCategory[] = ["VENUE", "PHOTOGRAPHER", "CATERER"];
const BEYOND_SHORTLIST: VendorBookingProgress[] = ["ENQUIRY_SENT", "MEETING_SCHEDULED", "NEGOTIATING", "BOOKED"];
const ACTIVELY_IN_PROGRESS: VendorBookingProgress[] = ["ENQUIRY_SENT", "MEETING_SCHEDULED", "NEGOTIATING"];

function groupInterestsByCategory(interests: VendorInterestSummary[]): Map<OnboardingVendorCategory, VendorInterestSummary[]> {
  const map = new Map<OnboardingVendorCategory, VendorInterestSummary[]>();
  for (const interest of interests) {
    if (!interest.onboardingCategory) continue;
    const list = map.get(interest.onboardingCategory) ?? [];
    list.push(interest);
    map.set(interest.onboardingCategory, list);
  }
  return map;
}

/** ~7 deterministic rules over real wedding data — the "proactive" half
 *  of BisaAI. Each rule fires zero or one suggestion; the caller (see
 *  lib/bisaai.ts's getProactiveSuggestions) sorts by severity and caps
 *  the list, so the couple always sees the most urgent things first. */
export function generateProactiveSuggestions(ctx: WeddingContext): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];

  if (ctx.budget.percentSpent >= 100) {
    suggestions.push({
      id: "budget-over",
      message: `You're over budget — ${formatGHS(ctx.budget.totalSpentGHS)} spent against a ${formatGHS(ctx.budget.totalBudgetGHS)} total. Worth reviewing which categories pushed past their allocation before booking anything else.`,
      severity: "warning",
      actionLabel: "View budget",
      actionHref: "/budget",
    });
  } else if (ctx.budget.percentSpent >= 80) {
    suggestions.push({
      id: "budget-high",
      message: `You're approaching ${Math.round(ctx.budget.percentSpent)}% of your budget. Here are three areas where couples commonly save money: catering headcount buffers, attire rental vs. buying, and bundling vendor packages.`,
      severity: "warning",
      actionLabel: "View budget",
      actionHref: "/budget",
    });
  }

  const interestsByCategory = groupInterestsByCategory(ctx.vendors.interests);

  // Refined from a plain "!== BOOKED" check: a category already
  // RESEARCHING/NEGOTIATING is real progress, not inaction — this rule
  // is specifically for critical categories with zero real interest yet.
  const untouchedCritical = CRITICAL_VENDOR_CATEGORIES.filter((c) => {
    const list = interestsByCategory.get(c) ?? [];
    return !list.some((i) => i.bookingProgress !== "NOT_CONTACTED");
  });
  if (untouchedCritical.length > 0 && ctx.daysUntil <= 70 && ctx.daysUntil >= 0) {
    suggestions.push({
      id: "vendor-unbooked-urgent",
      message: `You haven't contacted any ${humanize(untouchedCritical[0])}s yet, and your wedding is only ${weeksAway(ctx.daysUntil)} away.`,
      severity: "warning",
      actionLabel: "Browse vendors",
      actionHref: "/vendors",
    });
  }

  // Gentler, further-out sibling of the urgent rule above — fires only
  // past that rule's 70-day threshold so the two don't double up for the
  // same category with conflicting tones (warning vs. encouragement).
  const bookedCriticalCount = CRITICAL_VENDOR_CATEGORIES.filter((c) => ctx.vendors.byCategory[c] === "BOOKED").length;
  if (bookedCriticalCount >= 2 && ctx.daysUntil > 70 && ctx.daysUntil <= 100) {
    const nextUnbooked = CRITICAL_VENDOR_CATEGORIES.find((c) => ctx.vendors.byCategory[c] !== "BOOKED");
    if (nextUnbooked) {
      const bookedNames = CRITICAL_VENDOR_CATEGORIES.filter((c) => ctx.vendors.byCategory[c] === "BOOKED").map(humanize);
      suggestions.push({
        id: "vendor-next-category",
        message: `You've already secured your ${bookedNames.join(" and ")}. Since your wedding is only ${monthsAway(ctx.daysUntil)} away, I recommend booking ${humanize(nextUnbooked)} next.`,
        severity: "info",
        actionLabel: "Browse vendors",
        actionHref: "/vendors",
      });
    }
  }

  // A category with several shortlisted vendors but no enquiry sent to
  // any of them yet — the shortlist stalled before the next real step.
  const stalledEntry = [...interestsByCategory.entries()].find(([, list]) => {
    const shortlistedCount = list.filter((i) => i.bookingProgress === "SHORTLISTED").length;
    const hasProgressedFurther = list.some((i) => BEYOND_SHORTLIST.includes(i.bookingProgress));
    return shortlistedCount >= 2 && !hasProgressedFurther;
  });
  if (stalledEntry) {
    const [category, list] = stalledEntry;
    const shortlistedCount = list.filter((i) => i.bookingProgress === "SHORTLISTED").length;
    suggestions.push({
      id: "vendor-shortlisted-stalled",
      message: `You've shortlisted ${shortlistedCount} ${humanize(category)}s but haven't sent any enquiries yet.`,
      severity: "info",
      actionLabel: "Browse vendors",
      actionHref: "/vendors",
    });
  }

  // A vendor the couple is actively talking to (enquiry sent or further)
  // whose price already exceeds the matching budget category's allocation.
  const overBudgetInterest = ctx.vendors.interests.find((i) => {
    if (!ACTIVELY_IN_PROGRESS.includes(i.bookingProgress)) return false;
    const matched = matchVendorBudgetCategory(i.vendorCategory, ctx.budget.categories);
    return matched != null && i.priceLowGHS > matched.allocatedGHS;
  });
  if (overBudgetInterest) {
    const matched = matchVendorBudgetCategory(overBudgetInterest.vendorCategory, ctx.budget.categories)!;
    const over = overBudgetInterest.priceLowGHS - matched.allocatedGHS;
    suggestions.push({
      id: "vendor-over-budget",
      message: `The ${overBudgetInterest.vendorName} you're considering exceeds your allocated ${matched.name} budget by ${formatGHS(over)}. Would you like BisaAI to recommend alternatives within your budget?`,
      severity: "warning",
      actionLabel: "Browse vendors",
      actionHref: "/vendors",
    });
  }

  if (ctx.checklist.overdueCount > 0) {
    suggestions.push({
      id: "checklist-overdue",
      message: `You have ${ctx.checklist.overdueCount} overdue checklist task${ctx.checklist.overdueCount === 1 ? "" : "s"}. Let's catch up before the list grows.`,
      severity: "warning",
      actionLabel: "View checklist",
      actionHref: "/checklist",
    });
  }

  if (ctx.guests.totalAttendees > 0) {
    const pendingShare = ctx.guests.pendingAttendees / ctx.guests.totalAttendees;
    if (pendingShare >= 0.3 && ctx.guests.pendingAttendees >= 10) {
      suggestions.push({
        id: "rsvp-backlog",
        message: `You still have ${ctx.guests.pendingAttendees} pending RSVPs. Consider sending a reminder this week.`,
        severity: "info",
        actionLabel: "View guest list",
        actionHref: "/guests",
      });
    }
  }

  if (ctx.guests.totalRecords === 0 && ctx.guestEstimate > 0 && ctx.daysUntil <= 180 && ctx.daysUntil >= 0) {
    suggestions.push({
      id: "guest-list-not-started",
      message: `You've estimated ${ctx.guestEstimate} guests but haven't added anyone to your guest list yet — worth starting so RSVPs and seating have something to work from.`,
      severity: "info",
      actionLabel: "Add guests",
      actionHref: "/guests",
    });
  }

  if (ctx.checklist.overdueCount === 0 && ctx.checklist.totalCount > 0 && ctx.checklist.percent >= 50 && ctx.daysUntil > 14) {
    suggestions.push({
      id: "ahead-of-schedule",
      message: `Based on your planning progress, you're ahead of schedule — ${ctx.checklist.percent}% through your checklist with nothing overdue.`,
      severity: "positive",
    });
  }

  if (ctx.daysUntil >= 0 && ctx.daysUntil <= 30 && ctx.checklist.percent < 80 && ctx.checklist.totalCount > 0) {
    suggestions.push({
      id: "final-stretch-behind",
      message: `Your wedding is under a month away and your checklist is at ${ctx.checklist.percent}% — worth setting aside focused time this week to close the gap.`,
      severity: "warning",
      actionLabel: "View checklist",
      actionHref: "/checklist",
    });
  }

  return suggestions.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
