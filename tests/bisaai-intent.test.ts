// tests/bisaai-intent.test.ts
//
// detectIntent (lib/bisaai-intent.ts) is Layer 2 of BisaAI's three-layer
// architecture — pure structural-grammar parsing, no Prisma. These cases
// are every example command from the feature request itself (across all
// 7 command domains) plus all 8 Quick Actions, confirming each routes to
// the intent type the request's own routing implies.

import { describe, expect, it } from "vitest";
import { detectIntent } from "@/lib/bisaai-intent";

describe("detectIntent — budget commands", () => {
  it("'Add GHS 1,000 to Catering.' -> ADJUST_AMOUNT", () => {
    const intent = detectIntent("Add GHS 1,000 to Catering.");
    expect(intent).toMatchObject({ type: "ADJUST_AMOUNT", verb: "increase", target: "Catering", amountGHS: 1000, field: "allocatedGHS" });
  });

  it("'Move GHS 500 from Decor to Photography.' -> MOVE_AMOUNT", () => {
    const intent = detectIntent("Move GHS 500 from Decor to Photography.");
    expect(intent).toMatchObject({ type: "MOVE_AMOUNT", amountGHS: 500, source: "Decor", dest: "Photography" });
  });

  it("'Increase my venue budget by GHS 2,000.' -> ADJUST_AMOUNT with cleaned target", () => {
    const intent = detectIntent("Increase my venue budget by GHS 2,000.");
    expect(intent).toMatchObject({ type: "ADJUST_AMOUNT", verb: "increase", target: "venue", amountGHS: 2000 });
  });

  it("'Show me which categories are overspending.' -> SHOW_OVERSPENDING", () => {
    expect(detectIntent("Show me which categories are overspending.")).toEqual({ type: "SHOW_OVERSPENDING" });
  });
});

describe("detectIntent — checklist commands", () => {
  it("'Mark Photographer as booked.' -> MARK_AS", () => {
    expect(detectIntent("Mark Photographer as booked.")).toEqual({ type: "MARK_AS", target: "Photographer", statusWord: "booked" });
  });

  it("'Add a reminder to book transportation.' -> ADD_CHECKLIST_ITEM", () => {
    expect(detectIntent("Add a reminder to book transportation.")).toEqual({ type: "ADD_CHECKLIST_ITEM", title: "Book transportation" });
  });

  it("'Create a task to collect wedding rings.' -> ADD_CHECKLIST_ITEM", () => {
    expect(detectIntent("Create a task to collect wedding rings.")).toEqual({ type: "ADD_CHECKLIST_ITEM", title: "Collect wedding rings" });
  });
});

describe("detectIntent — guest list commands", () => {
  it("'Add John Mensah as Bride's guest.' -> ADD_GUEST", () => {
    expect(detectIntent("Add John Mensah as Bride's guest.")).toEqual({ type: "ADD_GUEST", name: "John Mensah", side: "BRIDE" });
  });

  it("'Mark Ama as Accepted.' -> MARK_AS", () => {
    expect(detectIntent("Mark Ama as Accepted.")).toEqual({ type: "MARK_AS", target: "Ama", statusWord: "accepted" });
  });

  it("'Show everyone with Pending RSVPs.' -> SHOW_PENDING_RSVPS", () => {
    expect(detectIntent("Show everyone with Pending RSVPs.")).toEqual({ type: "SHOW_PENDING_RSVPS" });
  });
});

describe("detectIntent — vendor commands", () => {
  it("'Find photographers within my budget.' -> FIND_VENDORS with category", () => {
    expect(detectIntent("Find photographers within my budget.")).toEqual({ type: "FIND_VENDORS", category: "PHOTOGRAPHY" });
  });

  it("'Mark Elegant Events as Shortlisted.' -> MARK_AS", () => {
    expect(detectIntent("Mark Elegant Events as Shortlisted.")).toEqual({ type: "MARK_AS", target: "Elegant Events", statusWord: "shortlisted" });
  });

  it("'Book Elegant Events.' -> MARK_AS with statusWord 'booked'", () => {
    expect(detectIntent("Book Elegant Events.")).toEqual({ type: "MARK_AS", target: "Elegant Events", statusWord: "booked" });
  });

  it("'Show my remaining vendor categories.' -> SHOW_REMAINING_VENDOR_CATEGORIES", () => {
    expect(detectIntent("Show my remaining vendor categories.")).toEqual({ type: "SHOW_REMAINING_VENDOR_CATEGORIES" });
  });
});

describe("detectIntent — traditional ceremony commands", () => {
  it("'Mark drinks as purchased.' -> MARK_AS", () => {
    expect(detectIntent("Mark drinks as purchased.")).toEqual({ type: "MARK_AS", target: "drinks", statusWord: "purchased" });
  });

  it("'Add GHS 500 to traditional gifts.' -> ADJUST_AMOUNT", () => {
    const intent = detectIntent("Add GHS 500 to traditional gifts.");
    expect(intent).toMatchObject({ type: "ADJUST_AMOUNT", verb: "increase", target: "traditional gifts", amountGHS: 500 });
  });

  it("'What traditional items are still outstanding?' -> SHOW_TRADITIONAL_OUTSTANDING", () => {
    expect(detectIntent("What traditional items are still outstanding?")).toEqual({ type: "SHOW_TRADITIONAL_OUTSTANDING" });
  });
});

describe("detectIntent — honeymoon commands", () => {
  it("'Increase honeymoon budget by GHS 1,000.' -> ADJUST_AMOUNT targeting 'honeymoon'", () => {
    const intent = detectIntent("Increase honeymoon budget by GHS 1,000.");
    expect(intent).toMatchObject({ type: "ADJUST_AMOUNT", verb: "increase", target: "honeymoon", amountGHS: 1000 });
  });

  it("'What honeymoon tasks are left?' -> SHOW_HONEYMOON_TASKS_LEFT", () => {
    expect(detectIntent("What honeymoon tasks are left?")).toEqual({ type: "SHOW_HONEYMOON_TASKS_LEFT" });
  });
});

describe("detectIntent — calendar commands", () => {
  it("'What is due this week?' -> SHOW_DUE_THIS_WEEK", () => {
    expect(detectIntent("What is due this week?")).toEqual({ type: "SHOW_DUE_THIS_WEEK" });
  });

  it("'Move my cake tasting to next Saturday.' -> RESCHEDULE", () => {
    expect(detectIntent("Move my cake tasting to next Saturday.")).toEqual({ type: "RESCHEDULE", target: "cake tasting", whenPhrase: "next Saturday" });
  });

  it("'Show upcoming deadlines.' -> SHOW_DEADLINES", () => {
    expect(detectIntent("Show upcoming deadlines.")).toEqual({ type: "SHOW_DEADLINES" });
  });
});

describe("detectIntent — the 8 Quick Actions", () => {
  it("'Help me allocate my budget' falls through to QA (budget topic keyword)", () => {
    const intent = detectIntent("💰 Help me allocate my budget");
    expect(intent.type).toBe("QA");
  });

  it("'What's due this week?' -> SHOW_DUE_THIS_WEEK", () => {
    expect(detectIntent("📋 What's due this week?")).toEqual({ type: "SHOW_DUE_THIS_WEEK" });
  });

  it("'Show pending guest RSVPs' -> SHOW_PENDING_RSVPS", () => {
    expect(detectIntent("👥 Show pending guest RSVPs")).toEqual({ type: "SHOW_PENDING_RSVPS" });
  });

  it("'Plan my traditional ceremony' falls through to QA (traditional topic keyword)", () => {
    const intent = detectIntent("🏛️ Plan my traditional ceremony");
    expect(intent.type).toBe("QA");
  });

  it("'Recommend vendors within budget' -> FIND_VENDORS with no category", () => {
    expect(detectIntent("🛍️ Recommend vendors within budget")).toEqual({ type: "FIND_VENDORS", category: undefined });
  });

  it("'Explain my Wedding Health Score' -> EXPLAIN_HEALTH_SCORE", () => {
    expect(detectIntent("🤖 Explain my Wedding Health Score")).toEqual({ type: "EXPLAIN_HEALTH_SCORE" });
  });

  it("'Help plan my honeymoon' falls through to QA (honeymoon topic keyword)", () => {
    const intent = detectIntent("✈️ Help plan my honeymoon");
    expect(intent.type).toBe("QA");
  });

  it("'Show upcoming deadlines' -> SHOW_DEADLINES", () => {
    expect(detectIntent("📅 Show upcoming deadlines")).toEqual({ type: "SHOW_DEADLINES" });
  });
});

describe("detectIntent — fallback", () => {
  it("an unrecognized message falls through to QA carrying the raw text", () => {
    expect(detectIntent("What's the meaning of life?")).toEqual({ type: "QA", message: "What's the meaning of life?" });
  });

  it("an empty message falls through to QA with an empty string", () => {
    expect(detectIntent("   ")).toEqual({ type: "QA", message: "" });
  });
});
