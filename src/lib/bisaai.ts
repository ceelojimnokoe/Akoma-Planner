// src/lib/bisaai.ts
//
// THE single entry point for everything BisaAI does. Every AI-flavored
// feature in the product — chat Q&A, vendor sourcing, message drafting,
// price estimates, the dress try-on stub, moodboards, timelines, etc. —
// is a typed function exported from this file. Nothing outside this file
// ever "talks to AI" directly.
//
// WHY THIS FILE EXISTS (the swap seam):
// Every function below is a MOCK today — no network call to a real model
// provider is made anywhere in this file. Each one has a `REAL INTEGRATION
// TODO` comment describing exactly what a real implementation would do
// (which provider, which prompt/inputs, which env var). Swapping mocks for
// real AI later means editing the body of these functions only; every
// page, component, and server action that calls them keeps working
// unchanged, because the function signatures and return shapes don't
// change.
//
// TWO STRUCTURAL SAFETY RULES ENFORCED BY THIS FILE'S DESIGN, NOT JUST BY
// CONVENTION:
//
// 1. NO AUTONOMOUS COMMITMENTS. Functions here NEVER write to any
//    state-changing table — not WeddingPlan, not VendorInterest, not
//    Guest, not BudgetCategory, not ChecklistItem. The only table any
//    function in this file writes to is AIInteractionLog (a pure audit
//    trail). draftVendorMessage() and draftNegotiationMessage() *return*
//    drafted text; they do not create or update a VendorInterest row.
//    Only a human-triggered server action (src/server/actions/vendors.ts)
//    can create a DRAFT row from that text, and only a *different*,
//    explicitly-named "send" or "approve quote" action can ever move a
//    VendorInterest to SENT or ACCEPTED. You can verify this invariant by
//    grepping this file for `prisma.` and confirming every write is to
//    `aIInteractionLog`.
//
// 2. NO PLAN GATING IN HERE. Whether a function is Free or requires the
//    Wedding Pass is decided by the caller (a server action) using
//    requirePass() from lib/plan.ts *before* calling into this file. This
//    file has no idea whether a wedding has the Pass — that keeps gating
//    logic in exactly one place (lib/plan.ts) instead of duplicated
//    across every AI function.

import { prisma } from "./prisma";
import type { City, Vendor, VendorCategory } from "@prisma/client";
import { formatGHS } from "./currency";
import { calculateGuestStats } from "./guests";

// ---------------------------------------------------------------------------
// Shared response envelope
// ---------------------------------------------------------------------------

export interface BisaAIMeta {
  /** Always true today. Flips to false only once a function below is
   *  rewired to call a real model provider — see the REAL INTEGRATION TODO
   *  comment on that function. The UI uses this to render a persistent
   *  "Mock" badge (see components/bisaai/EstimateBadge). */
  isMock: boolean;
  /** "mock" today; will become "openai" | "anthropic" etc. once a real
   *  provider is wired in. Read from BISAAI_PROVIDER so the UI/logs can
   *  show which backend actually produced a result. */
  provider: string;
  generatedAt: string;
  /** Set on anything involving prices or the dress try-on preview — the
   *  UI renders this prominently, not just in a tooltip (safe rules #2, #3). */
  disclaimer?: string;
}

export interface BisaAISuccess<T> {
  ok: true;
  data: T;
  meta: BisaAIMeta;
}

export interface BisaAIFailure {
  ok: false;
  error: string;
}

export type BisaAIResponse<T> = BisaAISuccess<T> | BisaAIFailure;

const PROVIDER = process.env.BISAAI_PROVIDER ?? "mock";

function ok<T>(data: T, disclaimer?: string): BisaAISuccess<T> {
  return {
    ok: true,
    data,
    meta: {
      isMock: PROVIDER === "mock",
      provider: PROVIDER,
      generatedAt: new Date().toISOString(),
      disclaimer,
    },
  };
}

function fail(error: string): BisaAIFailure {
  return { ok: false, error };
}

const ESTIMATE_DISCLAIMER =
  "These are estimated prices for planning purposes only, not firm quotes. Actual prices vary by vendor, season and negotiation.";

/** Writes one row to the AI audit trail. The only Prisma write allowed in this file. */
async function logAiInteraction(
  weddingPlanId: string,
  functionName: string,
  inputSummary: string,
  outputSummary: string
) {
  await prisma.aIInteractionLog.create({
    data: {
      weddingPlanId,
      functionName,
      inputSummary: truncate(inputSummary, 300),
      outputSummary: truncate(outputSummary, 300),
      isMock: PROVIDER === "mock",
    },
  });
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// ---------------------------------------------------------------------------
// 1. basicQA — Free tier
// ---------------------------------------------------------------------------

export interface BasicQAInput {
  weddingPlanId: string;
  question: string;
}

export interface BasicQAOutput {
  answer: string;
}

// A small keyword-matched knowledge base standing in for a real model.
// Deliberately simple and inspectable — every answer a user can get is
// visible right here, which is the point of a mock: predictable, honest,
// and easy to reason about before real model calls are wired in.
const QA_KNOWLEDGE_BASE: Array<{ keywords: string[]; answer: string }> = [
  {
    keywords: ["budget", "how much", "afford"],
    answer:
      "A common starting split for a Ghanaian wedding budget is roughly 25% venue, 20% catering, 15% attire, 15% traditional rites, and the remainder split across photography, decor, music and miscellaneous. Use the Budget tool to set real numbers against your own total — these are just typical proportions, not a rule.",
  },
  {
    keywords: ["traditional", "engagement", "knocking", "bride price"],
    answer:
      "Most Akan traditional/engagement ceremonies follow: family arrival and greetings, introductions through the linguist (okyeame), presentation of the bride-price list, the bride is 'found' and presented, a blessing, then a shared meal. Exact order and items vary by ethnic group and family — the Traditional List tool has estimated item costs if that's what you're after.",
  },
  {
    keywords: ["checklist", "timeline", "when should", "how early"],
    answer:
      "As a rough guide: lock the date and budget 12 months out, book venue/photographer/caterer 5–6 months out, sort attire 3–5 months out, send invitations 2 months out, and confirm final headcounts and logistics in the last 2 weeks. Your Checklist tab already has this laid out against your actual wedding date.",
  },
  {
    keywords: ["guest", "rsvp", "invite"],
    answer:
      "For Ghanaian weddings, it's common for actual attendance to run 10–20% over RSVP'd numbers, especially on the traditional side — caterers are often briefed with a buffer for this. The Guest List tab tracks RSVP status by side if you want to monitor this as replies come in.",
  },
];

const QA_FALLBACK_ANSWER =
  "I don't have a prepared answer for that one yet. Right now BisaAI's Q&A runs on a small fixed knowledge base rather than a real language model — try asking about budget splits, traditional ceremony order, checklist timing, or guest/RSVP planning, or check back once real AI is wired in.";

/** Free-tier Q&A. Real integration TODO: replace the keyword lookup below
 *  with a call to an LLM (OPENAI_API_KEY / ANTHROPIC_API_KEY), passing the
 *  question plus relevant wedding context (city, tradition, date) as
 *  grounding context in the prompt. */
export async function basicQA(input: BasicQAInput): Promise<BisaAIResponse<BasicQAOutput>> {
  const question = input.question.trim();
  if (!question) return fail("Ask BisaAI a question first.");

  const lower = question.toLowerCase();
  const match = QA_KNOWLEDGE_BASE.find((entry) =>
    entry.keywords.some((kw) => lower.includes(kw))
  );
  const answer = match?.answer ?? QA_FALLBACK_ANSWER;

  await logAiInteraction(input.weddingPlanId, "basicQA", question, answer);
  return ok({ answer });
}

// ---------------------------------------------------------------------------
// 2. sourceVendors — Pro
// ---------------------------------------------------------------------------

export interface SourceVendorsInput {
  weddingPlanId: string;
  category: VendorCategory;
  city: City;
}

export interface SourceVendorsOutput {
  vendors: Vendor[];
}

/** Pro. Grounded in real local data (no external call, mock or otherwise) —
 *  this just queries the seeded Vendor table, ranked by rating. Real
 *  integration TODO: once a broader/live vendor dataset exists, this could
 *  layer an LLM re-ranking or summarization step on top of the same query,
 *  but the source of truth stays the local DB either way. */
export async function sourceVendors(input: SourceVendorsInput): Promise<BisaAIResponse<SourceVendorsOutput>> {
  const vendors = await prisma.vendor.findMany({
    where: { category: input.category, city: input.city },
    orderBy: { rating: "desc" },
    take: 5,
  });

  await logAiInteraction(
    input.weddingPlanId,
    "sourceVendors",
    `category=${input.category} city=${input.city}`,
    `${vendors.length} vendors returned`
  );
  return ok({ vendors });
}

// ---------------------------------------------------------------------------
// 3. draftVendorMessage / draftNegotiationMessage — Pro, draft only
// ---------------------------------------------------------------------------

export interface DraftVendorMessageInput {
  weddingPlanId: string;
  vendorId: string;
  /** Optional extra detail the couple wants folded into the message. */
  extraContext?: string;
}

export interface DraftMessageOutput {
  draftMessage: string;
}

/** Pro. Returns drafted text only — see the safety note at the top of this
 *  file. Nothing here creates or sends anything; the caller decides
 *  whether/how to persist the draft as a VendorInterest row.
 *  Real integration TODO: replace the template below with an LLM call
 *  that's given the vendor's category/description and the wedding's
 *  city/date/guest count as context, and asked to draft a first-contact
 *  enquiry in a friendly, concise tone. */
export async function draftVendorMessage(input: DraftVendorMessageInput): Promise<BisaAIResponse<DraftMessageOutput>> {
  const [weddingPlan, vendor] = await Promise.all([
    prisma.weddingPlan.findUniqueOrThrow({ where: { id: input.weddingPlanId } }),
    prisma.vendor.findUniqueOrThrow({ where: { id: input.vendorId } }),
  ]);

  const dateStr = weddingPlan.weddingDate.toLocaleDateString("en-GH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const draftMessage =
    `Hello ${vendor.name},\n\n` +
    `My partner and I are planning our wedding (${weddingPlan.coupleNames}) for ${dateStr} ` +
    `in ${titleCase(weddingPlan.city)}, with around ${weddingPlan.guestEstimate} guests. ` +
    `We're interested in your ${categoryLabel(vendor.category)} services and would love to know ` +
    `availability and pricing for our date.` +
    (input.extraContext ? ` ${input.extraContext}` : "") +
    `\n\nLooking forward to hearing from you.\nThank you!`;

  await logAiInteraction(input.weddingPlanId, "draftVendorMessage", `vendor=${vendor.name}`, "drafted enquiry message");
  return ok({ draftMessage });
}

export interface DraftNegotiationMessageInput {
  weddingPlanId: string;
  vendorId: string;
  /** The quote currently on the table, if any. */
  currentQuoteGHS?: number;
  /** What the couple is hoping to negotiate toward — used only to shape
   *  the tone/ask of the draft, never sent or acted on automatically. */
  targetGHS?: number;
  notes?: string;
}

/** Pro. Draft only — same rule as draftVendorMessage above. Real
 *  integration TODO: replace the template with an LLM call given the
 *  current quote, target, and any notes, asked to draft a polite,
 *  specific counter-offer or clarifying question. */
export async function draftNegotiationMessage(input: DraftNegotiationMessageInput): Promise<BisaAIResponse<DraftMessageOutput>> {
  const vendor = await prisma.vendor.findUniqueOrThrow({ where: { id: input.vendorId } });

  let draftMessage = `Hello ${vendor.name},\n\nThank you for the quote`;
  if (input.currentQuoteGHS) draftMessage += ` of ${formatGHS(input.currentQuoteGHS)}`;
  draftMessage += `. We're really keen to work with you`;
  if (input.targetGHS) {
    draftMessage += `, but our budget for this is closer to ${formatGHS(input.targetGHS)} — is there any flexibility, `;
    draftMessage += `or a package that could get us nearer that number?`;
  } else {
    draftMessage += `. Could you let us know if there's any flexibility on the pricing, or what's included at different price points?`;
  }
  if (input.notes) draftMessage += ` ${input.notes}`;
  draftMessage += `\n\nThanks so much for your patience — we'll confirm as soon as we've discussed as a couple.`;

  await logAiInteraction(
    input.weddingPlanId,
    "draftNegotiationMessage",
    `vendor=${vendor.name} currentQuote=${input.currentQuoteGHS ?? "n/a"}`,
    "drafted negotiation message"
  );
  return ok({ draftMessage });
}

// ---------------------------------------------------------------------------
// 4. priceTraditionalList — Pro, estimates only
// ---------------------------------------------------------------------------

export interface PriceTraditionalListInput {
  weddingPlanId: string;
  city: City;
}

export interface PriceTraditionalListOutput {
  city: City;
  itemsByCategory: Record<
    string,
    Array<{ itemName: string; estLowGHS: number; estHighGHS: number; market: string; notes: string | null }>
  >;
  totalEstimateLowGHS: number;
  totalEstimateHighGHS: number;
}

/** Pro. Reads the seeded TraditionalListItem table (real local reference
 *  data) and aggregates it — every price returned is explicitly a range,
 *  never a single number, and meta.disclaimer is always set (safe rule
 *  #3). Real integration TODO: an LLM could help tailor item selection to
 *  a specific tradition/family size, but the underlying price data should
 *  keep coming from a maintained local table, not be invented by a model. */
export async function priceTraditionalList(input: PriceTraditionalListInput): Promise<BisaAIResponse<PriceTraditionalListOutput>> {
  const items = await prisma.traditionalListItem.findMany({
    where: { city: input.city },
    orderBy: { category: "asc" },
  });

  const itemsByCategory: PriceTraditionalListOutput["itemsByCategory"] = {};
  let totalLow = 0;
  let totalHigh = 0;
  for (const item of items) {
    (itemsByCategory[item.category] ??= []).push({
      itemName: item.itemName,
      estLowGHS: item.estLowGHS,
      estHighGHS: item.estHighGHS,
      market: item.market,
      notes: item.notes,
    });
    totalLow += item.estLowGHS;
    totalHigh += item.estHighGHS;
  }

  await logAiInteraction(
    input.weddingPlanId,
    "priceTraditionalList",
    `city=${input.city}`,
    `${items.length} items, estimate ${formatGHS(totalLow)}–${formatGHS(totalHigh)}`
  );

  return ok(
    { city: input.city, itemsByCategory, totalEstimateLowGHS: totalLow, totalEstimateHighGHS: totalHigh },
    ESTIMATE_DISCLAIMER
  );
}

// ---------------------------------------------------------------------------
// 5. generateShoppingList — Pro, estimates only
// ---------------------------------------------------------------------------

export interface GenerateShoppingListInput {
  weddingPlanId: string;
  guestEstimate: number;
}

export interface ShoppingListItem {
  category: string;
  itemName: string;
  estLowGHS: number;
  estHighGHS: number;
  notes: string;
}

export interface GenerateShoppingListOutput {
  items: ShoppingListItem[];
  totalEstimateLowGHS: number;
  totalEstimateHighGHS: number;
}

// A small fixed catalog standing in for a real model's suggestions.
// Per-guest items scale with guestEstimate; others are flat wedding-wide costs.
const SHOPPING_CATALOG: Array<
  Omit<ShoppingListItem, "estLowGHS" | "estHighGHS"> & { perGuestLowGHS: number; perGuestHighGHS: number } | ShoppingListItem
> = [
  { category: "Decor & Stationery", itemName: "Invitation cards", perGuestLowGHS: 8, perGuestHighGHS: 25, notes: "Printed, per household not per guest — treat this estimate as a rough per-guest proxy." },
  { category: "Decor & Stationery", itemName: "Wedding programs", perGuestLowGHS: 3, perGuestHighGHS: 8, notes: "" },
  { category: "Favors & Gifts", itemName: "Guest favors (small gift/branded item)", perGuestLowGHS: 10, perGuestHighGHS: 35, notes: "" },
  { category: "Bridal Party Gifts", itemName: "Bridesmaid gifts", estLowGHS: 800, estHighGHS: 3000, notes: "Assumes 4–6 bridesmaids." } as ShoppingListItem,
  { category: "Bridal Party Gifts", itemName: "Groomsmen gifts", estLowGHS: 800, estHighGHS: 3000, notes: "Assumes 4–6 groomsmen." } as ShoppingListItem,
  { category: "Miscellaneous", itemName: "Guest book", estLowGHS: 150, estHighGHS: 500, notes: "" } as ShoppingListItem,
  { category: "Miscellaneous", itemName: "Ring pillow & flower basket", estLowGHS: 100, estHighGHS: 400, notes: "" } as ShoppingListItem,
];

/** Pro. Real integration TODO: an LLM could personalize catalog selection
 *  and quantities based on the couple's stated style/preferences; for now
 *  this scales a fixed catalog by guest count, which is at least grounded
 *  in the wedding's real data rather than fully invented. */
export async function generateShoppingList(input: GenerateShoppingListInput): Promise<BisaAIResponse<GenerateShoppingListOutput>> {
  const items: ShoppingListItem[] = SHOPPING_CATALOG.map((entry) => {
    if ("perGuestLowGHS" in entry) {
      return {
        category: entry.category,
        itemName: entry.itemName,
        estLowGHS: Math.round(entry.perGuestLowGHS * input.guestEstimate),
        estHighGHS: Math.round(entry.perGuestHighGHS * input.guestEstimate),
        notes: entry.notes,
      };
    }
    return entry;
  });

  const totalLow = items.reduce((sum, i) => sum + i.estLowGHS, 0);
  const totalHigh = items.reduce((sum, i) => sum + i.estHighGHS, 0);

  await logAiInteraction(
    input.weddingPlanId,
    "generateShoppingList",
    `guestEstimate=${input.guestEstimate}`,
    `${items.length} items, estimate ${formatGHS(totalLow)}–${formatGHS(totalHigh)}`
  );

  return ok({ items, totalEstimateLowGHS: totalLow, totalEstimateHighGHS: totalHigh }, ESTIMATE_DISCLAIMER);
}

// ---------------------------------------------------------------------------
// 6. dressTryOn — Pro, EXPERIMENTAL STUB, consent-gated
// ---------------------------------------------------------------------------

export interface DressTryOnInput {
  weddingPlanId: string;
  /** Must be explicitly true — the caller (UI) is responsible for showing
   *  the consent checkbox and disclaimer *before* calling this function.
   *  This function refuses to run without it as a second line of defense. */
  consentGiven: boolean;
  dressStyle?: string;
}

export interface DressTryOnOutput {
  previewImageUrl: string;
}

const DRESS_TRYON_DISCLAIMER =
  "Experimental preview — not accurate. This image is a placeholder in the demo build and must not be used to make purchase decisions.";

/** Pro, experimental. Safe rule #2: consent-gated, and this is a STUB — it
 *  never runs a real image model and never persists the uploaded photo.
 *  Intentionally, this function's signature doesn't even accept photo
 *  bytes: the mock ignores photo content entirely rather than pretend to
 *  process it, so there's no code path here that could accidentally store
 *  or forward a real photo anywhere.
 *  Real integration TODO: accept the uploaded image (via a signed upload,
 *  not inline base64, to keep payloads sane), send it to an image-
 *  generation provider alongside the requested dress style, store the
 *  couple's explicit consent timestamp, and never retain the source photo
 *  longer than needed to generate the preview. */
export async function dressTryOn(input: DressTryOnInput): Promise<BisaAIResponse<DressTryOnOutput>> {
  if (!input.consentGiven) {
    return fail("Consent is required before generating a dress try-on preview.");
  }

  await logAiInteraction(
    input.weddingPlanId,
    "dressTryOn",
    `dressStyle=${input.dressStyle ?? "unspecified"}`,
    "returned static placeholder preview image (experimental stub)"
  );

  return ok({ previewImageUrl: "/mock/dress-tryon-placeholder.svg" }, DRESS_TRYON_DISCLAIMER);
}

// ---------------------------------------------------------------------------
// 7. decorMoodboard — Pro, stub
// ---------------------------------------------------------------------------

export interface DecorMoodboardInput {
  weddingPlanId: string;
  style?: string;
  colorPalette?: string[];
}

export interface DecorMoodboardOutput {
  moodboardImageUrls: string[];
  paletteDescription: string;
}

/** Pro. Stub — no real image generation. Real integration TODO: call an
 *  image-generation provider with the requested style/palette and the
 *  wedding's city/tradition as context, and store results against the
 *  wedding rather than regenerating on every view. */
export async function decorMoodboard(input: DecorMoodboardInput): Promise<BisaAIResponse<DecorMoodboardOutput>> {
  const palette = input.colorPalette?.length ? input.colorPalette.join(", ") : "gold, deep green, cream";
  const paletteDescription = `A ${input.style ?? "classic elegant"} palette built around ${palette}.`;

  await logAiInteraction(
    input.weddingPlanId,
    "decorMoodboard",
    `style=${input.style ?? "unspecified"} palette=${palette}`,
    "returned 3 static placeholder moodboard tiles (stub)"
  );

  return ok({
    moodboardImageUrls: [
      "/mock/moodboard-placeholder.svg",
      "/mock/moodboard-placeholder.svg",
      "/mock/moodboard-placeholder.svg",
    ],
    paletteDescription,
  });
}

// ---------------------------------------------------------------------------
// 8. generateTimeline — Pro, minute-by-minute, stub
// ---------------------------------------------------------------------------

export interface GenerateTimelineInput {
  weddingPlanId: string;
  /** 24h "HH:MM" start time for the day's first scheduled activity. */
  startTime: string;
}

export interface TimelineEntry {
  time: string;
  activity: string;
  durationMinutes: number;
}

export interface GenerateTimelineOutput {
  entries: TimelineEntry[];
}

// A realistic, fixed running order for a Ghanaian wedding day. Deterministic
// template rather than a real model call — see REAL INTEGRATION TODO below.
const TIMELINE_TEMPLATE: Array<{ activity: string; durationMinutes: number }> = [
  { activity: "Vendor arrival & venue setup", durationMinutes: 90 },
  { activity: "Bridal party hair & makeup touch-up", durationMinutes: 60 },
  { activity: "Guests begin arriving & seating", durationMinutes: 45 },
  { activity: "Processional", durationMinutes: 15 },
  { activity: "Ceremony", durationMinutes: 60 },
  { activity: "Recessional & photos with immediate family", durationMinutes: 30 },
  { activity: "Cocktail hour / guest mingling", durationMinutes: 60 },
  { activity: "Reception entrance & couple's grand entrance", durationMinutes: 15 },
  { activity: "Welcome toasts & speeches", durationMinutes: 30 },
  { activity: "Dinner service", durationMinutes: 60 },
  { activity: "Cake cutting", durationMinutes: 15 },
  { activity: "First dance & family dances", durationMinutes: 20 },
  { activity: "Open dancing & entertainment", durationMinutes: 90 },
  { activity: "Couple's send-off", durationMinutes: 15 },
];

/** Pro. Real integration TODO: an LLM could adjust this running order
 *  based on ceremony type (church vs. registry vs. traditional-only) or
 *  couple preferences supplied via chat; today the template is fixed and
 *  only the clock times are computed dynamically from startTime. */
export async function generateTimeline(input: GenerateTimelineInput): Promise<BisaAIResponse<GenerateTimelineOutput>> {
  let currentMinutes = parseHHMM(input.startTime);
  const entries: TimelineEntry[] = TIMELINE_TEMPLATE.map((step) => {
    const entry = { time: formatHHMM(currentMinutes), activity: step.activity, durationMinutes: step.durationMinutes };
    currentMinutes += step.durationMinutes;
    return entry;
  });

  await logAiInteraction(input.weddingPlanId, "generateTimeline", `startTime=${input.startTime}`, `${entries.length}-step timeline generated`);
  return ok({ entries });
}

// ---------------------------------------------------------------------------
// 9. seatingSuggestions — Pro, stub
// ---------------------------------------------------------------------------

export interface SeatingSuggestionsInput {
  weddingPlanId: string;
  tableSize?: number;
}

export interface SeatingTable {
  tableNumber: number;
  side: "BRIDE" | "GROOM" | "MIXED";
  guestNames: string[];
}

export interface SeatingSuggestionsOutput {
  tableSize: number;
  tables: SeatingTable[];
}

/** Pro. Grounded in the real guest list (confirmed YES RSVPs only) —
 *  simple rule-based grouping by side, not a real optimizer. Real
 *  integration TODO: an LLM or constraint solver could account for
 *  relationships/conflicts noted by the couple; today it's a greedy
 *  fixed-capacity bin-pack, one pass through the guest list in side
 *  order. Packs by *seats*, not guest rows — a guest with +1 checked
 *  takes 2 seats at their table (see lib/guests.ts), so a table never
 *  actually seats more people than tableSize just because the head
 *  count of *rows* happened to fit. */
export async function seatingSuggestions(input: SeatingSuggestionsInput): Promise<BisaAIResponse<SeatingSuggestionsOutput>> {
  const tableSize = input.tableSize ?? 10;
  const guests = await prisma.guest.findMany({
    where: { weddingPlanId: input.weddingPlanId, rsvpStatus: "YES" },
    orderBy: { side: "asc" },
  });

  function buildTable(chunk: typeof guests, tableNumber: number): SeatingTable {
    const sides = new Set(chunk.map((g) => g.side));
    const side = sides.size > 1 ? "MIXED" : (chunk[0]?.side ?? "MIXED");
    return {
      tableNumber,
      side: side as SeatingTable["side"],
      guestNames: chunk.map((g) => g.name + (g.plusOne ? " (+1)" : "")),
    };
  }

  const tables: SeatingTable[] = [];
  let currentChunk: typeof guests = [];
  let currentSeats = 0;

  for (const guest of guests) {
    const seats = guest.plusOne ? 2 : 1;
    if (currentChunk.length > 0 && currentSeats + seats > tableSize) {
      tables.push(buildTable(currentChunk, tables.length + 1));
      currentChunk = [];
      currentSeats = 0;
    }
    currentChunk.push(guest);
    currentSeats += seats;
  }
  if (currentChunk.length > 0) tables.push(buildTable(currentChunk, tables.length + 1));

  const totalAttendees = calculateGuestStats(guests).confirmedAttendees;
  await logAiInteraction(input.weddingPlanId, "seatingSuggestions", `tableSize=${tableSize}`, `${tables.length} tables suggested for ${totalAttendees} confirmed attendees`);
  return ok({ tableSize, tables });
}

// ---------------------------------------------------------------------------
// 10. honeymoonRecommendations — Pro, estimates only, stub
// ---------------------------------------------------------------------------

export interface HoneymoonRecommendationsInput {
  weddingPlanId: string;
  budgetGHS?: number;
}

export interface HoneymoonOption {
  destination: string;
  country: string;
  estLowGHS: number;
  estHighGHS: number;
  description: string;
}

export interface HoneymoonRecommendationsOutput {
  options: HoneymoonOption[];
}

const HONEYMOON_CATALOG: HoneymoonOption[] = [
  { destination: "Busua Beach", country: "Ghana", estLowGHS: 3000, estHighGHS: 8000, description: "Laid-back beach resort stay on Ghana's western coast, 4–5 nights." },
  { destination: "Cape Coast & Elmina", country: "Ghana", estLowGHS: 2500, estHighGHS: 6500, description: "Heritage coast stay combining beach resorts with historical sites." },
  { destination: "Zanzibar", country: "Tanzania", estLowGHS: 18000, estHighGHS: 40000, description: "Classic East African beach honeymoon, 5–7 nights including flights." },
  { destination: "Cape Town", country: "South Africa", estLowGHS: 22000, estHighGHS: 45000, description: "Wine country, coastline and city, 6–8 nights including flights." },
  { destination: "Dubai", country: "UAE", estLowGHS: 25000, estHighGHS: 55000, description: "City and beach combination, 5–7 nights including flights." },
  { destination: "Seychelles", country: "Seychelles", estLowGHS: 35000, estHighGHS: 70000, description: "High-end private-island beach honeymoon, 5–7 nights including flights." },
];

/** Pro. Real integration TODO: an LLM could weigh season, visa
 *  requirements and stated preferences; today this filters a fixed
 *  catalog by budget only. Every price shown is an estimate range. */
export async function honeymoonRecommendations(input: HoneymoonRecommendationsInput): Promise<BisaAIResponse<HoneymoonRecommendationsOutput>> {
  const options = input.budgetGHS
    ? HONEYMOON_CATALOG.filter((o) => o.estLowGHS <= input.budgetGHS! * 1.15)
    : HONEYMOON_CATALOG;

  await logAiInteraction(
    input.weddingPlanId,
    "honeymoonRecommendations",
    `budgetGHS=${input.budgetGHS ?? "unspecified"}`,
    `${options.length} destinations returned`
  );

  return ok({ options: options.length ? options : HONEYMOON_CATALOG.slice(0, 2) }, ESTIMATE_DISCLAIMER);
}

// ---------------------------------------------------------------------------
// 11. suggestHashtags — Pro, stub
// ---------------------------------------------------------------------------

export interface SuggestHashtagsInput {
  weddingPlanId: string;
}

export interface SuggestHashtagsOutput {
  hashtags: string[];
}

/** Pro. Real integration TODO: an LLM would generate more varied,
 *  creative wordplay; today this is deterministic string manipulation on
 *  the couple's names and wedding year. */
export async function suggestHashtags(input: SuggestHashtagsInput): Promise<BisaAIResponse<SuggestHashtagsOutput>> {
  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: input.weddingPlanId } });
  const names = weddingPlan.coupleNames.split(/&| and /i).map((n) => n.trim().replace(/[^a-zA-Z]/g, ""));
  const year = weddingPlan.weddingDate.getFullYear();
  const [a, b] = [names[0] || "Couple", names[1] || "Love"];

  const hashtags = [
    `#${a}And${b}${year}`,
    `#${a}Loves${b}`,
    `#The${a}${b}Wedding`,
    `#${a}${b}${year}`,
    `#${a}To${b}`,
  ];

  await logAiInteraction(input.weddingPlanId, "suggestHashtags", weddingPlan.coupleNames, hashtags.join(", "));
  return ok({ hashtags });
}

// ---------------------------------------------------------------------------
// 12. generateSocialPost — Pro, stub
// ---------------------------------------------------------------------------

export interface GenerateSocialPostInput {
  weddingPlanId: string;
  platform: "instagram" | "facebook";
}

export interface GenerateSocialPostOutput {
  caption: string;
}

/** Pro. Real integration TODO: an LLM would vary tone/length per
 *  platform; today it's a single template with a platform-specific
 *  sign-off. */
export async function generateSocialPost(input: GenerateSocialPostInput): Promise<BisaAIResponse<GenerateSocialPostOutput>> {
  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: input.weddingPlanId } });
  const dateStr = weddingPlan.weddingDate.toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" });
  const hashtagResult = await suggestHashtags({ weddingPlanId: input.weddingPlanId });
  const hashtags = hashtagResult.ok ? hashtagResult.data.hashtags.slice(0, 3).join(" ") : "";

  const caption =
    `We're getting married! 💛 ${weddingPlan.coupleNames} are tying the knot on ${dateStr} ` +
    `in ${titleCase(weddingPlan.city)}. Can't wait to celebrate with everyone who's made it this far with us.\n\n${hashtags}` +
    (input.platform === "instagram" ? "\n(link in bio for our registry)" : "");

  await logAiInteraction(input.weddingPlanId, "generateSocialPost", `platform=${input.platform}`, "drafted social caption");
  return ok({ caption });
}

// ---------------------------------------------------------------------------
// 13. draftEmailInvite — Pro, draft only, stub
// ---------------------------------------------------------------------------

export interface DraftEmailInviteInput {
  weddingPlanId: string;
  guestName?: string;
}

export interface DraftEmailInviteOutput {
  subject: string;
  body: string;
}

/** Pro. Draft only — no email is ever sent from this function; there is
 *  no email-sending integration anywhere in this MVP. Real integration
 *  TODO: an LLM could personalize tone per guest relationship; today it's
 *  a single template with a name placeholder filled in. */
export async function draftEmailInvite(input: DraftEmailInviteInput): Promise<BisaAIResponse<DraftEmailInviteOutput>> {
  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: input.weddingPlanId } });
  const dateStr = weddingPlan.weddingDate.toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" });
  const greetingName = input.guestName ?? "there";

  const subject = `You're invited: ${weddingPlan.coupleNames}'s Wedding — ${dateStr}`;
  const body =
    `Dear ${greetingName},\n\n` +
    `We're overjoyed to invite you to celebrate our wedding! ${weddingPlan.coupleNames} will be tying the knot ` +
    `on ${dateStr} in ${titleCase(weddingPlan.city)}, and it wouldn't be the same without you there.\n\n` +
    `More details on venue and timing to follow — please save the date!\n\n` +
    `With love,\n${weddingPlan.coupleNames}`;

  await logAiInteraction(input.weddingPlanId, "draftEmailInvite", `guestName=${input.guestName ?? "unspecified"}`, "drafted invite email");
  return ok({ subject, body });
}

// ---------------------------------------------------------------------------
// Small local helpers
// ---------------------------------------------------------------------------

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function categoryLabel(category: VendorCategory): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function formatHHMM(totalMinutes: number): string {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
