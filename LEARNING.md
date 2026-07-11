# LEARNING.md

A running log of the decisions made while building AkomaPlanner, what the
alternatives were, and why we picked what we picked. Written for future-me,
studying for interviews.

---

## 1. Overall architecture: full-stack Next.js, no separate backend

**Chosen:** One Next.js App Router app. UI, server logic, and data access
all live in one codebase. Server Components fetch data directly; mutations
go through Server Actions (`"use server"` functions) instead of a hand-rolled
REST API.

**Alternatives considered:**
- Separate Express/Fastify API + separate frontend (classic SPA split).
- tRPC on top of Next.js for end-to-end typed API calls.

**Why:** For a solo-built MVP, a split backend adds real cost (CORS, two
deploy targets, duplicated types) for no benefit at this scale — Next.js
Server Actions already give end-to-end TypeScript types without a separate
API layer. tRPC is a great pattern but is redundant once you're already
inside Next.js Server Actions; it mainly earns its keep when a *separate*
non-Next.js client needs typed calls into the same backend. We use plain
`app/api/*` route handlers only where something is conceptually a real
endpoint (PDF export, stub checkout) rather than an internal form
submission.

---

## 2. Service layer between routes and Prisma

**Chosen:** `src/lib/*.ts` holds all business logic (budget math, plan
gating, AI calls) and is the only code that imports `prisma` for anything
non-trivial. `src/server/actions/*.ts` is thin glue: parse input, call
`lib/`, return a result. Components and routes never embed business logic.

**Why:** This is the seam that makes two later migrations painless:
1. **SQLite → Postgres** — only `src/lib/prisma.ts` and `prisma/schema.prisma`
   change; nothing above the service layer knows or cares what database is
   underneath.
2. **Mock AI → real AI** — only `src/lib/bisaai.ts` changes; every page/
   component calls the same typed functions regardless of what's behind
   them.

Without this seam, "swap the database" or "swap the AI provider" turns into
a grep-and-replace across dozens of files instead of editing one.

---

## 3. Prisma + SQLite now, Postgres-ready later

**Chosen:** SQLite for local dev via Prisma, with the explicit intent to
swap to hosted Postgres (Neon/Supabase) post-MVP.

**What actually makes this portable:**
- `prisma/schema.prisma` only uses cross-database Prisma types (`String`,
  `Int`, `Float`, `Boolean`, `DateTime`, `enum`, relations). Nothing SQLite-
  specific is used in any model.
- The **only** SQLite-specific line in the whole project is
  `provider = "sqlite"` in the `datasource` block, plus the `DATABASE_URL`
  value in `.env`. Moving to Postgres means changing those two things and
  running `prisma db push` (or a real migration) against the new database
  — no model or query code changes.
- One caveat worth knowing for interviews: **SQLite has no native enum
  type.** Prisma fakes enums on SQLite by storing them as a `TEXT` column
  with an application-level check; on Postgres, the exact same
  `enum Plan { FREE PRO }` schema line compiles to a real native Postgres
  `ENUM` type. You don't have to do anything differently — Prisma's
  abstraction handles it — but it's a good example of how an ORM's schema
  language can hide real differences in what the underlying database
  supports.

---

## 4. Money stored as `Float` (GHS), not integer minor units

**Chosen:** All monetary fields (`totalBudgetGHS`, `allocatedGHS`,
`priceLowGHS`, etc.) are Prisma `Float`.

**Alternative:** Store money as `Int` pesewas (GHS's minor unit, like cents)
— e.g. GHS 500.00 stored as `50000` — and divide by 100 at every display
boundary. This is the textbook-correct pattern for financial ledgers,
because floating point can't exactly represent values like 0.1 and
accumulates rounding error across many additions.

**Why we didn't do that here:** Every money value in AkomaPlanner is a
*planning estimate* the couple edits directly in a form (budget category
allocations, guest count × per-head catering estimate, etc.), not a ledger
processing hundreds of small transactions where rounding error compounds.
No payment amounts are actually captured or settled in this MVP — checkout
is a stub. Given that, `Float` keeps every read/write path simple (no
cents-conversion helper needed anywhere) at a rounding-error cost that's
irrelevant at this scale and precision (we display to the nearest cedi).
**If this app ever processes real payments,** that's exactly the point
where the integer-minor-units pattern becomes non-negotiable — worth
remembering for that interview question about "how do you store money."

---

## 5. Stubbed session instead of real auth

**Chosen:** No login screen for the MVP. `src/lib/session.ts` returns a
hardcoded "current user" (seeded in `prisma/seed.ts`), clearly labelled as
a stub.

**Why:** Real auth (NextAuth/Auth.js, password hashing, email verification,
session cookies) is a large, mostly-orthogonal concern to what this project
is teaching — data modeling, service-layer architecture, feature gating,
and the AI-safety patterns. Building it now would burn significant time
without adding to the core learning goals. The `WeddingMember` join table
and `User` model are still designed as if real auth existed, so swapping
the stub for real auth later is additive (add password/OAuth fields to
`User`, add a login route, replace `getCurrentUser()`'s hardcoded return
with a real session lookup) rather than a redesign.

---

## 6. `AIInteractionLog` table

**Chosen:** Every call to a `lib/bisaai.ts` function writes a row: which
function, an input summary, an output summary, and an `isMock` flag.

**Why:** Two reasons. First, it's a concrete, inspectable audit trail that
backs up the safety claim "BisaAI never sends or books anything on its
own" — you can literally query the table and see that no row was ever
written by an AI function with a status beyond DRAFT/SENT. Second, this is
how real AI products actually work in practice (usage logging, debugging,
cost tracking, eval datasets) — worth having built once, even in miniature.

---

## 7. Vendor negotiation state machine (safety rule #1, in schema form)

**Chosen:** `VendorInterestStatus` enum: `DRAFT → SENT → QUOTED →
ACCEPTED/DECLINED`. `lib/bisaai.ts`'s `draftVendorMessage()` and
`draftNegotiationMessage()` can only ever write `DRAFT` rows. A separate,
human-triggered server action is the only code path that can transition a
row to `SENT`, and a *different*, explicitly-labelled "approve quote"
server action is the only path to `ACCEPTED`.

**Why this belongs in the data model, not just the UI:** If the "no
autonomous booking" rule only lived in a UI button, a future bug (or a
future AI function) could still write `ACCEPTED` directly. By making the
enum transition itself something only specific, narrowly-scoped server
actions perform — and never anything inside `lib/bisaai.ts` — the safety
property is enforced by *which code is allowed to call which function*,
not just by what the UI happens to show. We'll revisit this concretely
once we write the server actions.

---

## 8. Dependency versions: deliberately not bleeding-edge

**Chosen:** Next.js 15.5.x (not 16.x), Prisma 6.19.x (not 7.x), Tailwind
3.4.x (not 4.x), TypeScript 5.9.x (not the new native/Go-based 7.x),
ESLint 9.x.

**Why:** All of these have newer majors available. For a project whose
main goal is *learning*, I prioritized versions with mature, stable,
widely-documented APIs I can explain correctly and debug confidently, over
being on the absolute latest release. This is a real engineering tradeoff
you'll make repeatedly: "latest" and "best for the team learning it" are
not always the same choice. Tailwind 3 specifically also matches the
`tailwind.config.ts`-based structure we agreed on — Tailwind 4 moves
configuration into CSS (`@theme` in `globals.css`) by default, which is a
fine pattern too, just a different one than we planned around.

---

## 9. Data model shape (see prisma/schema.prisma for full detail)

**Chosen:** `WeddingPlan` as the central aggregate root, with
`BudgetCategory`, `ChecklistItem`, `Guest`, `VendorInterest`, and
`AIInteractionLog` all foreign-keyed to it and cascade-deleted with it.
`Vendor`, `TraditionalListItem`, and `Accommodation` are global reference
data (not per-wedding) that every plan reads from.

**Why the global-vs-per-wedding split:** Vendors, traditional-list items,
and accommodations describe the real world (a caterer in Accra exists
independent of any specific wedding) — modeling them per-wedding would
mean re-seeding the same vendor for every couple and losing the ability to
compare across weddings later (e.g. "which vendors are most popular").
Everything that's inherently *this couple's data* (their budget, their
guest list, their negotiation with a vendor) is scoped to their
`WeddingPlan` and deleted if the plan is deleted.

---

## 10. Seed data: the sample wedding is Free, not Pro

**Chosen:** `prisma/seed.ts` creates one sample wedding ("Ama & Kwame") on
the **Free** plan, with a full set of budget categories, a real checklist
generated from `buildDefaultChecklist()`, 18 guests, and four
`VendorInterest` rows deliberately covering all four lifecycle states
(`DRAFT`, `SENT`, `QUOTED`, `ACCEPTED`) so every stage of the negotiation
flow has an example to look at immediately.

**Why Free, not Pro:** The whole point of the paywall work later is to
verify that gated features are *visibly present but blocked* for a Free
user. Seeding as Free means that behavior is exercised by default the
moment the app runs, rather than only after manually flipping a flag. The
intended way to move this seeded wedding to Pro is the same path a real
user takes: the stub checkout on the pricing page (safe rule #4) — that
keeps the demo honest about how upgrades actually happen.

---

## 11. A real example of float rounding, caught by a test

While seeding, the very first version of `tests/budget.test.ts` asserted
`percentSpent` equals exactly `55` — and failed, because
`(5500 / 10000) * 100` evaluates to `55.00000000000001` in JavaScript
floating-point arithmetic, not `55`. Fixed by asserting with
`toBeCloseTo()` instead of `toBe()`, which is the correct way to compare
floats in tests generally (never assert exact equality on a computed
float). This is the same class of issue discussed in #4 (money as
`Float`) — a live example of why financial ledgers use integer minor
units, caught by the test suite before it ever reached the UI.

---

## 12. `lib/bisaai.ts`: safety enforced by *what code is allowed to write*, not just UI copy

**Chosen:** Every one of the 13 BisaAI functions (`basicQA`,
`sourceVendors`, `draftVendorMessage`, `draftNegotiationMessage`,
`priceTraditionalList`, `generateShoppingList`, `dressTryOn`,
`decorMoodboard`, `generateTimeline`, `seatingSuggestions`,
`honeymoonRecommendations`, `suggestHashtags`, `generateSocialPost`,
`draftEmailInvite`) lives in one file and returns a common
`BisaAIResponse<T>` envelope (`{ ok, data, meta }` or `{ ok: false, error
}`). `meta.isMock` and `meta.disclaimer` are populated automatically by
two small helpers (`ok()`/`fail()`) so no individual function can forget
to mark itself as mock or drop a required disclaimer.

**The two rules that matter most, made structural rather than aspirational:**

1. **This file can only write to `AIInteractionLog`.** I grepped the
   finished file for `prisma.` to confirm: every read hits Vendor,
   TraditionalListItem, Guest, or WeddingPlan; every write hits
   `aIInteractionLog`. `draftVendorMessage()` and
   `draftNegotiationMessage()` *return* text — they do not touch
   `VendorInterest` at all. That table only ever gets written to by
   server actions we haven't built yet, and only one of those actions
   (an explicit, separately-named "approve quote" action) will ever be
   allowed to set status `ACCEPTED`. Because the boundary is "which file
   is allowed to import what," not "please remember not to do X," a
   future bug is far less likely to silently violate the no-autonomous-
   booking rule.
2. **This file has zero knowledge of Free vs. Pro.** `requirePro()` (from
   `lib/plan.ts`) is meant to be called by the server action *before* it
   reaches into `bisaai.ts`. Keeping gating logic out of the AI module
   means there's exactly one place in the whole codebase that decides
   what's a paid feature — consistent with the service-layer split in #2.

**Where the "mock" is genuinely honest vs. merely simple:** A few
functions (`generateTimeline`, `seatingSuggestions`, `suggestHashtags`)
are deterministic and arguably *already correct* without a real model —
they're rule-based generators, not placeholders pretending to be smarter
than they are. Others (`basicQA`'s keyword lookup, the shopping/honeymoon
catalogs) are explicitly simplified stand-ins for what a real model would
do, and are commented as such with a `REAL INTEGRATION TODO`. Both kinds
report `meta.isMock: true` and log to `AIInteractionLog` identically —
the UI doesn't need to know which kind of mock it's looking at, only that
it *is* one.

**`dressTryOn()` doesn't accept photo bytes at all.** Rather than accept
an uploaded photo and simply "not do anything real with it" (which would
leave a code path that *could* be changed to store or forward a real
photo), the function signature has no photo parameter — the mock ignores
photo content by construction, not by omission. The real-integration TODO
notes that a production version would need a signed-upload flow and an
explicit retention policy for the source photo, which is a deliberately
harder problem than the mock needs to solve.

---

## 13. Onboarding redirects both ways, instead of a stateless form

**Chosen:** `/onboarding` (Server Component) checks the database for an
existing wedding plan owned by the current user and redirects to
`/dashboard` if one exists — the setup form only ever renders for a
genuinely new user. Symmetrically, `(app)/layout.tsx` — the layout wrapping
every "inside the product" page — checks the same thing in reverse and
redirects to `/onboarding` if no plan exists yet. Together these mean no
page below `(app)/` ever has to defend against "what if there's no wedding
plan" — that invariant is guaranteed one layer up, once.

**Why this mattered for testing:** Because the seed script always gives
the stub user a wedding plan, `/onboarding` normally never shows its form
in this demo — it just redirects straight through. To actually verify the
form (not just that the redirect worked), I temporarily cleared the
seeded `WeddingPlan` row, confirmed the form rendered and that
`/dashboard` correctly redirected back to `/onboarding` in that state,
then re-ran `npm run db:seed` to restore the demo data. Worth remembering
as a general pattern: seeded "there's always data" demo states can hide
empty-state code paths from casual testing — you sometimes have to
deliberately create the empty state to prove the empty-state code works.

**Server Actions and `redirect()`:** `createWeddingPlan()` in
`src/server/actions/wedding.ts` calls `next/navigation`'s `redirect()` on
success, which throws a special error Next's request pipeline catches to
issue the redirect — it only works inside an actual request. That meant I
couldn't smoke-test the exported action function directly from a bare
script (unlike `lib/bisaai.ts`'s functions, which have no such
dependency). Instead I tested the same Prisma call shape the action uses
in a standalone script first, then verified the real HTTP behavior
(redirects, form rendering) with curl against the running dev server —
two different verification techniques for two different kinds of code.

---

## 14. Nav shows every feature; gating happens on the page, not the link

**Chosen:** `Sidebar.tsx` lists every feature from the product spec,
including the four Pro-only tools (Traditional List, Accommodation,
Collaboration, Design Tools), each with a visible `Pro` badge — none of
them are hidden or removed for a Free-plan wedding. The sidebar itself
does zero gating; it's pure navigation. Whether a given page actually
lets a Free user in (and what they see if not) is that page's own
concern, using `requirePro()` from `lib/plan.ts`.

**Why:** This directly implements the "every Pro feature visibly present
but gated" requirement, and keeps the sidebar simple — it doesn't need to
know the current plan at all, only which routes exist.

---

## 15. The Budget page needed a real browser to verify, not just curl

**Chosen:** The Budget tool (`src/app/(app)/budget/page.tsx` +
`src/server/actions/budget.ts`) is fully editable: inline "save on blur"
number inputs per category, an add-category form, delete. All three
mutations (`addBudgetCategory`, `updateBudgetCategory`,
`deleteBudgetCategory`) call `revalidatePath()` after writing.

**Why curl wasn't enough this time:** Next.js Server Actions invoked from
a client component (not a raw `<form action={...}>`) are called via a
special encoded POST that isn't practical to hand-craft with curl, and
functions like `revalidatePath()`/`redirect()` throw when called outside
a real request context — I confirmed this directly: calling
`addBudgetCategory()` from a bare script threw `Invariant: static
generation store missing` right after the database write succeeded. That
was enough to prove the write logic was correct, but not enough to prove
the *interactive* experience (inline edit → save → UI reflects the new
total) actually works end-to-end in a browser.

**What I did about it:** Installed Playwright + a headless Chromium
(`npm install -D playwright && npx playwright install chromium`) and
drove the real page: filled the "spent" input for Venue, blurred it,
added a "Honeymoon" category through the form, and screenshotted the
result. The screenshot showed everything recalculating correctly,
including a good edge case I hadn't deliberately tested — allocating more
than the total budget showed "**-GH₵12,000.00 unallocated**" (correctly
negative, since `unallocatedGHS = totalBudgetGHS - totalAllocatedGHS`
from `lib/budget.ts` handles over-allocation without special-casing it).

**Why this is worth setting up now, once:** Every remaining feature in
this app (checklist toggles, guest RSVP editing, vendor interest actions,
the BisaAI chat box, the dress try-on consent checkbox, the pricing
toggle) is exactly this same shape — a client component calling a Server
Action. Rather than re-discover "curl can't drive this" on every future
page, Playwright is now available for the rest of the build to actually
click through each interactive feature instead of only trusting
type-checks and the data layer.

---

## 16. A real bug Playwright testing caught: NULL due dates sorting first

**Chosen:** The Checklist page's Pro/Free split is unlimited vs.
`FREE_LIMITS.maxCustomChecklistItems` (15) custom tasks — default
(`isDefault: true`) items never count against it, mirroring the guest-cap
pattern in `lib/plan.ts`.

**The bug:** While testing the add-task flow with Playwright, I added a
custom task with no due date and it rendered at the *top* of its category
— ahead of genuinely overdue default tasks. The cause: `orderBy: [{
dueDate: "asc" }]` sorts `NULL` as the smallest possible value in SQLite
(and most SQL databases) by default, so undated tasks always sort before
every dated one, burying the most time-sensitive items under a task that
has no urgency at all. Fixed with Prisma's `orderBy: [{ dueDate: { sort:
"asc", nulls: "last" } }]`, confirmed working against SQLite (this is a
Prisma-level abstraction, not something every database's SQL dialect
spells the same way underneath).

**Why this is a good example for the study doc:** the seeded demo data
never exposed this — every seeded checklist item has a computed due date,
so `NULL` never appeared in that dataset. It only showed up once I
exercised the *real* user path (adding a task without picking a date)
through an actual interaction, not by reading the seed data. This is the
same lesson as #13 (empty states hidden by seeded data), one layer
deeper: even non-empty seeded data can hide bugs in code paths the seed
never happens to exercise. General takeaway: seed data proves "the happy
path with realistic data works"; it doesn't prove every input shape does.

---

## 17. Guest List: the same cap-and-gate pattern, third time

**Chosen:** `addGuest()` in `src/server/actions/guests.ts` gates on
`canAddGuest()` exactly like `addChecklistItem()` gates on
`canAddChecklistItem()` and `createWeddingPlan()` gates on
`canCreateWeddingPlan()` — count existing rows, check the plan, allow or
return an `upgradeReason`. RSVP status updates and deletes are always
allowed regardless of plan, same reasoning as checklist items: managing
what already exists isn't the gated action, adding more past the free
limit is.

**Why repeating this pattern three times is good, not bad:** each of the
three gates lives in `lib/plan.ts` as its own small named function
(`canCreateWeddingPlan`, `canAddChecklistItem`, `canAddGuest`) rather than
one generic `checkLimit(resource, count)` helper. A generic version would
be marginally less code, but every call site would need to know which
resource string maps to which limit and message — the specific functions
are self-documenting at the call site and each can carry its own
plan-specific copy in the upgrade message. Three near-identical functions
that are each trivial to read beats one clever function that requires
cross-referencing `lib/plan.ts` to understand what's being checked. This
is the same "three similar lines beats a premature abstraction" judgment
call as the reused CRUD-action shape across budget/checklist/guests —
consistent shape is good, forced abstraction isn't.

**Playwright verification:** confirmed RSVP dropdown updates persist and
reflect immediately (with the same optimistic-update-then-rollback
pattern as the checklist checkbox), confirmed a new guest appears in the
table, then seeded 100 total guests directly via Prisma and confirmed the
UI correctly blocked guest #101 with the upgrade message — and, just as
important, confirmed the blocked guest's name never actually appeared in
the table (the block isn't just cosmetic, the write genuinely didn't
happen).

---

## 18. Vendors: two independent gates, and the safety rule end to end

**Chosen:** Two separate things are gated on the vendor pages, and it's
worth keeping them conceptually distinct:
1. **Listing-level gate:** a vendor with `isProFeatured: true` shows its
   price/rating/description/contact only to Pro plans — a Free viewer
   sees the listing exists (name, category, city) but not its details.
2. **Tool-level gate:** the whole enquiry/negotiation/quote-tracking
   panel (`VendorInterestPanel`) requires Pro *regardless* of whether the
   specific vendor is Pro-featured — messaging is a Pro tool, independent
   of which vendor you're messaging.

Both are enforced twice: once in the page (for UX — show the right thing)
and again inside every `src/server/actions/vendors.ts` function (the real
boundary — a page-level check is a courtesy, not security, since a page
check can't stop a direct call to the action).

**The negotiation state machine, exercised end to end:** I flipped the
seeded wedding to `PRO` temporarily and drove the *entire* lifecycle
through the real UI with Playwright: draft an enquiry (BisaAI, status
`DRAFT`) → edit the drafted text → tap Send (status `SENT`) → manually
record a quote a vendor gave (status `QUOTED`) → generate a negotiation
counter-message for reference (never persisted, never sent) → tap
"Approve quote" behind a `confirm()` dialog (status `ACCEPTED`). Then
checked the database directly rather than trusting the UI: `status:
'ACCEPTED', quoteAmountGHS: 5000`. That's the concrete, end-to-end proof
that the safe-by-design rule from the very first message in this project
— "a quote can only become ACCEPTED through an explicit human approval
step" — actually holds, not just in the schema comments but in the
running system.

**Why the compare-selection checkboxes are visible to Free users:**
`VendorGrid`'s checkboxes and the "Compare" floating bar have no plan
check at all — any user can select vendors and navigate to
`/vendors/compare`. The Pro gate lives entirely on the destination page.
This was a deliberate choice to keep the "every Pro feature visibly
present" rule honest: hiding the checkboxes would technically also
satisfy "gated," but showing the *interaction* and then gating the
*result* communicates the Pro value far better than a feature that
doesn't appear to exist until you pay for it.

**Distance was dropped from the vendor comparison table** (the spec
mentions "price/distance/rating"). `Vendor` has no location/distance
field, and a distance number is only meaningful relative to a reference
point — which is exactly what `Accommodation.distanceFromVenueKm` models
against a specific venue. Comparing two caterers' "distance" from each
other has no obvious meaning, so the comparison table shows price range,
rating, and city instead. Worth remembering as a judgment call: a spec
phrase doesn't always map 1:1 onto a field if the underlying concept
doesn't actually apply to the data.

---

## 19. BisaAI page: link out instead of duplicating UI that lives elsewhere

**Chosen:** The BisaAI hub (`/bisaai`) has three parts: the free Q&A chat,
six Pro tools rendered inline (shopping list, decor moodboard, honeymoon
ideas, hashtags + social caption, email invite draft), and four
`ToolLinkCard`s that just link to `/vendors`, `/traditional-list`,
`/dress-tryon`, and `/design` — because `sourceVendors`, `priceTraditionalList`,
`dressTryOn`, `generateTimeline`, and `seatingSuggestions` already have (or
will have) dedicated, richer screens elsewhere. The alternative — building
a second, lighter-weight UI for those five functions here too — would mean
two places to keep in sync every time one changed, for no real user
benefit (the dedicated screens are strictly better than a chat-page
widget for the same task).

**Why the inline tools didn't get one shared generic component:** Each of
the six inline tools has a genuinely different input shape (some take no
input, some take a budget number, some take a style + palette pair) and a
genuinely different result shape. `ToolCard` factors out only what's
actually identical across all of them — the title/description/Pro-badge
header — and each tool keeps its own state and rendering. Forcing a
single generic `<AITool inputs={} render={} />` component to cover six
different shapes would need enough configuration surface that reading a
call site wouldn't be meaningfully shorter than just reading the
component itself.

**Why Free users see every Pro tool card with no separate "locked" state
in this page:** unlike the vendor detail page (which explicitly branches
on `requirePro()` to show `UpgradePrompt` instead of the panel), the
BisaAI Pro tools render for everyone and the gate only fires *inside* the
server action when a Free user actually clicks a button — the error
message returned by `requirePro()` is displayed inline exactly like any
other error would be. Confirmed both states with Playwright: clicking
"Generate shopping list" as Free surfaced the upgrade message; the exact
same click as Pro returned real (mock) data. One code path, two outcomes,
no special-casing needed in the page component.

**A real Next.js gotcha caught before it shipped:** `next/image` refuses
to optimize local SVGs by default (an XSS precaution) and would have
thrown on the moodboard placeholder assets. Since these are small, fully
trusted, static files (not user uploads), a plain `<img>` tag is the
right fix — not worth turning on `dangerouslyAllowSVG` for.

---

## 20. Traditional List page: render-on-load, not click-to-generate

**Chosen:** Unlike the BisaAI hub's six inline tools (each behind a
"Generate" button), `/traditional-list` calls
`priceTraditionalList()` directly while the Server Component renders —
no button, the data is just there when the page loads, with a plain GET
city switcher (same pattern as the vendor filters).

**Why the inconsistency is intentional:** the BisaAI hub is a
multi-tool page where opt-in buttons make sense (you wouldn't want six
API calls firing on every page load). Traditional List is a *dedicated
screen* whose entire purpose is showing this one thing — same category of
page as Vendors or Budget, which also render their data immediately with
no "Load" button. The rule of thumb that fell out of this: a page
dedicated to one piece of data loads it; a page offering a menu of
optional tools waits to be asked. Worth noting as a minor tradeoff: this
means every page view (including a plain refresh) writes an
`AIInteractionLog` row, which is fine for an MVP audit trail but would be
worth debouncing or dropping entirely for read-only, non-mutating calls
in a real production system with real traffic.

---

## 21. Calendar: a pure, tested month-grid function before any UI

**Chosen:** `getMonthGrid(year, month)` in `src/lib/dates.ts` builds a
Monday-first 6-week grid (padded with adjacent-month days) as a pure
function returning `Date[][]`, with no dependency on Prisma, Next.js, or
even the calendar page itself. `isSameDay()` is the other small helper
the page needs to match fetched events (checklist due dates, and on Pro,
`VendorInterest.updatedAt`) against grid cells.

**Why this got a test before the page did:** month-boundary date math is
a classic source of off-by-one bugs (leading/trailing days, month/year
rollover, how many weeks to render). While writing the function I went
through two flawed approaches — a loop-with-break version that rendered a
variable, sometimes-wrong number of weeks, and a version that
round-tripped through `Date.getDate()` in a way that silently reused the
wrong month — and caught both by reasoning through the date arithmetic
before either one was ever run, not by a failing test. `tests/dates.test.ts`
was written against the final version and passed immediately. The honest
lesson here is narrower than "tests caught bugs": fiddly date/number math
is easy to get subtly wrong even when you're being careful, and a
two-minute pure-function test is what lets you *trust* that the careful
reasoning was actually correct, rather than finding out via a
mis-rendered calendar grid three files later. Same category of lesson as
#11 (budget float rounding) and #16 (checklist NULL ordering) — pure
functions in `lib/` are cheap to verify in isolation; UI bugs from the
same root cause are much more annoying to trace back.

**Free vs. Pro on this page:** Free shows the wedding date and checklist
due dates; Pro layers `VendorInterest` activity (drafted/sent/quoted/
booked, keyed off `updatedAt`) into the same grid. Both task and vendor
event lists are capped at 2 visible items per cell with a "+N more"
overflow — a real bug I caught visually in testing: the first version
capped checklist tasks but not vendor events, so a day with several
vendor updates (all seeded in the same batch, so all sharing one
timestamp) visually overflowed its cell.

---

## 22. Accommodation: "by side" as a workflow, not a schema field

**Chosen:** `/accommodation` is a straightforward filtered, sorted
browse view over the global `Accommodation` table (closest-to-venue
first), Pro-gated, no mutations at all — the simplest page in the app.

**The "by side" requirement, and why I didn't add a schema field for it:**
the spec asks for accommodation "by side" (bride's family vs. groom's
family). `Accommodation` was designed back at the schema stage as global
reference data — like `Vendor` and `TraditionalListItem` — with no
per-wedding relationship, so there's nowhere to persist "we're
recommending listing X to the bride's side" without adding a new
per-wedding join table (something like `VendorInterest`, but for
lodging). That's a real, reasonable feature — but it wasn't part of the
schema we agreed on, and adding a table mid-build for one page is exactly
the kind of scope growth worth flagging rather than quietly doing.
Instead, the page leans on copy ("share different options with each side
depending on budget and who's traveling") and lets the couple use the
same sorted, filtered list for both sides manually. If per-side tracking
turns out to matter, the fix is additive: a small
`AccommodationRecommendation(weddingPlanId, accommodationId, side)` table,
following the exact same pattern `VendorInterest` already establishes —
not a redesign.

---

## 23. Collaboration: an honest "no real invites" limitation, and a privacy choice on the public page

**Chosen:** `addCollaborator()` in `src/server/actions/collaboration.ts`
upserts a `User` by email and links it as a `WeddingMember` immediately —
no invite email, no acceptance step, no separate login for that person.
The header comment on that file, and a line of copy right in the form
itself ("this MVP doesn't send a real invite email or have separate
logins yet"), both say so plainly. This is the same honesty principle as
labelling BisaAI mocks — a limitation stated in the UI is categorically
different from a limitation silently glossed over. Since `lib/session.ts`
already treats "who's using the app" as swappable (LEARNING.md #5), wiring
up a real invite flow later is additive to this same `WeddingMember`
table, not a rebuild.

**The public share page deliberately shows less than it could.**
`/w/[shareToken]` has full read access to the wedding's data (it's a
single unauthenticated Prisma query) but only renders coupleNames, date,
city, tradition, a countdown, an aggregate guest-confirmed count, and a
checklist-progress percentage. No budget figures, no individual guest
names or contact info, no vendor quotes or negotiation notes. Nothing in
the spec explicitly required this restraint — "generate a shareable
read-only wedding page" doesn't say *which* fields — but a link with no
login that anyone can forward is exactly the kind of surface where
"technically allowed to show it" and "should show it" diverge. Worth
treating as a general rule: the least private plausible reading of a
sharing feature is usually the right default, not the most feature-rich
one.

**Regenerating the share token was tested end-to-end, not just as a
"does the field update" check:** copied the link, regenerated it, then
actually navigated to the *old* URL and confirmed it 404s (Prisma's
`findUnique` on the old token now matches nothing), then navigated to the
*new* URL and confirmed it renders. The interesting failure mode this
guards against isn't "does regenerate work" — it's "does the old link
silently keep working," which a naive implementation (e.g. keeping a list
of valid tokens instead of a single current one) could easily get wrong.

---

## 24. Design Tools: not everything Pro has to be AI

**Chosen:** `/design` has three sections — a timeline
(`generateTimeline()`), a seating chart (`seatingSuggestions()`), both
linked here rather than duplicated on the BisaAI hub (#19's pattern
again), and an invitation template gallery
(`InvitationTemplates.tsx`) that is **not** AI-backed at all: three
CSS-styled layouts rendered with the couple's real name/date/city, no
`bisaai.ts` call, no mock badge, no disclaimer, because none is needed —
it's a genuinely finished feature, just a simple one.

**Why this distinction matters and isn't just a technicality:** this
project's safe-by-design rules require every AI output to be honestly
labelled (Mock, Estimate, Experimental). Slapping a "Mock" badge on the
invitation gallery would actually be *dishonest in the other direction* —
it would imply there's a real AI capability behind it that's merely
unwired, when actually the templates are complete and require no further
integration. Getting labelling right means asking "is this actually a
stand-in for a future capability, or is it just... done?" for every
feature, not applying a blanket disclaimer to anything in a Pro-tier
folder.

**The two GET forms on this page needed hidden fields to avoid clobbering
each other:** both the timeline's start-time form and the seating chart's
table-size form submit via plain GET (same no-client-JS pattern as
elsewhere), but they live on the same page and share the URL's query
string. Without a `startTime` hidden field in the seating form (and a
`tableSize` hidden field in the timeline form), updating one would reset
the other to its default. Caught this while writing the Playwright
test — the fix is two one-line hidden inputs, but it's the kind of thing
that's invisible until you actually interact with both controls in
sequence.

---

## 25. Dress Try-On: safe rule #2, built to the letter

**Chosen:** `DressTryOnForm.tsx` shows the disclaimer banner
*immediately*, before any file is chosen — not after generating, not
behind a modal. The "Generate preview" button is disabled until **both**
a photo is selected **and** the consent checkbox is checked (verified in
Playwright: disabled with neither, still disabled with just the photo,
only enabled once both are true). The uploaded photo is displayed via
`URL.createObjectURL()` — an in-browser-only object reference — and
`runDressTryOn()` never receives the file at all, only the boolean
consent flag and a style string, mirroring the "no photo parameter"
design already committed to in `lib/bisaai.ts` (#12).

**Why the consent check exists in two places (button `disabled` state
*and* `dressTryOn()`'s own runtime check):** the UI disabling the button
is a courtesy, not a guarantee — same reasoning as the vendor-approval
`confirm()` dialog (#18). The actual enforcement is
`bisaai.dressTryOn()` refusing to run at all when `consentGiven` isn't
`true`, which was already verified back when the module was first built
(see the early smoke test). A user could theoretically call the server
action directly with `consentGiven: false` and skip the UI entirely —
and the function would still refuse. That's the difference between a
gate that's merely inconvenient to bypass and one that's actually
enforced.

---

## 26. Export: a real bug from a library boundary, caught by actually downloading the file

**Chosen:** `lib/pdf.ts` uses `pdf-lib` (pure JS, no native deps, no
headless-browser-at-request-time) with a small hand-rolled `PdfWriter`
that tracks a cursor position and adds new pages automatically —
`pdf-lib` itself has no concept of flowing text across page breaks.
`/api/export/schedule-pdf` (free) and `/api/export/full-report-pdf`
(Pro, gated the same `requirePro()` way as everything else) are real
`app/api/*` route handlers, not Server Actions, because a file download
is genuinely a different kind of thing than a form mutation — same
distinction noted back in #1.

**The bug:** the first version of the Pro export 500'd with `Error:
WinAnsi cannot encode "₵"`. `pdf-lib`'s standard 14 fonts (Helvetica,
etc.) use WinAnsi encoding — essentially Windows-1252 — which has no
glyph for the Ghana Cedi sign (₵, U+20B5) that `formatGHS()` uses
everywhere in the UI via `Intl.NumberFormat`'s `narrowSymbol` currency
display. It only surfaced in the *Pro* export because that's the first
PDF that renders any money — the free schedule PDF has no currency
figures in it at all, so `tsc`, every other page using `formatGHS()`
correctly (rendered in a browser, which has full Unicode font support),
and even a first successful curl against the free endpoint all gave false
confidence. Fixed with a PDF-specific `formatGHSForPdf()` that spells out
"GHS" instead of the symbol — the two formatters now deliberately
diverge, and that divergence is commented at the point of definition so
it doesn't look like an accidental inconsistency later.

**Why this is a good example of "the boundary between systems is where
bugs hide":** every layer involved was individually correct — `formatGHS()`
does exactly what it's supposed to for its actual audience (HTML in a
browser), and `pdf-lib`'s encoding restriction is a reasonable, documented
constraint of the standard PDF fonts. The bug only exists at the seam
where a string built for one rendering target (the DOM) got handed to a
renderer with a narrower character set (WinAnsi-encoded PDF text). Worth
remembering generally: shared formatting helpers are a great DRY pattern
right up until two consumers have genuinely different constraints — at
that point, forking the helper (as done here) is more honest than
stretching one function to serve both.

**How this got caught:** by actually fetching the endpoint and checking
the response, not by reading the code. `curl` against the free endpoint
returned a valid `file`-confirmed PDF; the same check against the Pro
endpoint returned an HTTP 500, which pointed straight at the dev server
log with a full stack trace. I also tried harder to get a true rendered
screenshot of the PDF output (via Chromium's PDF viewer) and hit two
dead ends worth noting honestly rather than glossing over: Playwright
treats navigation to a `Content-Disposition: attachment` response as a
download rather than a view, and `pdf-parse`'s installed version had an
unrelated packaging quirk that broke text extraction. Neither was worth
chasing further once the actually-important check — does the real HTTP
endpoint succeed and return valid PDF bytes — was already confirmed.
Knowing when a verification method has hit diminishing returns is itself
part of testing well.

---

## 27. Pricing & stubbed checkout: honesty over the spec's literal wording

**Chosen:** `/pricing` lists the Free vs. Pro comparison with the
Monthly (GHS 62) / Yearly (GHS 500) / One-time Wedding Pass (GHS 188)
toggle from a single shared `lib/pricing.ts`. Two of the Pro bullets from
the original spec — "full cloud backup/restore" and "unlimited AI image
generation" — are **not** on the page. Neither exists anywhere in this
app: there's no backup/restore feature at all, and the "image" tools
(`decorMoodboard`, `dressTryOn`) are explicitly-labelled placeholder
stubs, not real generation. The project's own non-negotiable rule — "do
not overstate capabilities anywhere in the UI" — applies to the pricing
page just as much as to a BisaAI chat response; a paywall promising a
feature that doesn't exist is the single worst place to be dishonest,
since it's the page most directly tied to someone paying money. Replaced
those two bullets with an honest list of what Pro actually unlocks in
this codebase. Flagged this deviation from the literal spec explicitly
rather than silently swapping the copy.

**The checkout page has no payment fields at all** — not "fields that
don't validate," not "fields that get discarded," none, period. One
button: "Simulate successful payment." The page states outright, in
copy a user actually reads, that this is a demo and names the real
integration path (Paystack/Hubtel, via env vars already scaffolded in
`.env.example`) and the one thing a real integration must do differently:
flip `plan` to `PRO` from a **webhook** that verifies payment succeeded,
never from a client-triggered action the way this stub does. That
distinction (trust the payment provider's server-to-server confirmation,
never the browser telling you "it worked") is the actual security lesson
behind safe rule #4, not just "don't store card numbers."

**A new Server Action pattern used here for the first time:**
`upgradeToPro.bind(null, weddingPlan.id, interval)` passed directly to
`<form action={...}>`, with zero client-side JavaScript — different from
every other mutation in this project, which goes through a Client
Component calling the action inside `useTransition` (for pending/error
UI state). The checkout button and the Settings page's "switch back to
Free" button both use the `.bind()` + plain `<form>` pattern instead,
because neither needs client state: checkout redirects server-side on
success, and the downgrade stub doesn't need a pending spinner for a
sub-100ms operation. Worth remembering as a real design choice, not a
missed refactor: reach for `useTransition` when you need to *show*
something happening client-side (a disabled button, an inline error);
reach for a bound form action when the server response (redirect, or a
simple re-render) is the entire UI update needed.

**A verification rabbit hole worth writing up honestly:** my first
combined Playwright test for this feature reported multiple apparent
failures — checkout not receiving the right billing interval, the stub
payment not redirecting, the database not updating. All three turned out
to be test-script bugs, not app bugs, and untangling them taught two
real things. First: `page.waitForLoadState("networkidle")` is the wrong
wait condition after clicking a Next.js `<Link>` (client-side/soft
navigation doesn't reliably trigger it) — `page.waitForURL(...)` is
correct there, while `waitForLoadState` is correct after a real `<form>`
POST. Second, and subtler: checking a Prisma write's result from a
*separate OS process* (my verification script) immediately after the
*browser* considers a request finished can race a SQLite cross-connection
visibility gap — measured at ~66ms in this case via a polling loop. This
never affects a real user, because the page they see is re-rendered by
the *same* server process that just performed the write — there is no
cross-process gap in actual usage, only in a second process's separate
database handle checking too eagerly. Distinguishing "my test is wrong"
from "my app is wrong" required isolating each step individually rather
than trusting a long chained script's output at face value — the same
discipline as #12's "grep the file for every `prisma.` call" instinct,
applied to a live system instead of static code.

---

## 28. The most important bug in this whole project was found by running `next build`, not `next dev`

**What happened:** every page of this app was built and verified against
`next dev` — dozens of checkpoints, real Playwright interactions, real
database writes. Every one of them passed. Then, for the first time in
the whole build, I ran `npm run build` (the actual production build) and
read its route summary: almost every page under `(app)/` — Dashboard,
Budget, Checklist, Guests, BisaAI, Settings, and more — compiled as `○
Static` instead of `ƒ Dynamic`.

**Why that's serious:** a statically-prerendered page is rendered
*once*, at build time, and that exact HTML is served to every visitor
until the next build. Every one of those pages reads live data via
`getCurrentWeddingPlan()`/Prisma with no `cookies()`, `headers()`, or
`searchParams` usage — the signals Next.js normally uses to decide a
route needs per-request rendering. With no such signal, Next.js defaults
to trying static optimization, sees the data-fetch succeed at build time
using whatever was in the database *then*, and bakes that snapshot in.
In a real deployment, this would have meant: budget edits, checklist
check-offs, RSVP changes — every mutation this app exists to make —
would never appear to any visitor, ever, after the first build. `next
dev` never surfaces this because dev mode always renders fresh,
regardless of a route's static/dynamic classification.

**The fix:** one line, `export const dynamic = "force-dynamic";`, added
to `(app)/layout.tsx` (propagates to every nested page) and to the
standalone `/onboarding` page (outside that layout, needed its own).
Rebuilt and confirmed every data-dependent route now shows `ƒ`, while
`/` and `/pricing` — genuinely static, no database reads — correctly
stayed `○`. Then went one step further than trusting the build log: ran
the actual production server (`next start`), edited a checklist item
directly in the database, and confirmed the running dashboard reflected
it without a rebuild — proving the fix works, not just that the build
log looks different.

**The lesson to actually remember:** `next dev` and `next build` are not
the same product. Static-vs-dynamic rendering is a build-time decision
that dev mode papers over entirely, which means a data-driven app can
look completely correct through unlimited dev-mode testing and still be
fundamentally broken the moment it's actually deployed. This is worth
holding onto for any framework with this shape (Next.js, Nuxt, SvelteKit
— anything doing automatic static optimization): **run the production
build at least once before considering a feature done**, not only at
the very end of a project. This one was caught at the end here, which
worked out, but it's the kind of bug that's cheap to catch immediately
and expensive to catch after a real deploy.

---

## 29. Fixing the ESLint setup that should have existed since the scaffold

While running final checks, `npm run lint` failed outright:
`eslint.config.js` never existed — I'd pinned `eslint@9` back at the
dependency-selection stage (LEARNING.md #8) specifically because
`eslint-config-next` required it, but never actually created the flat
config ESLint 9 requires, so `lint` had been silently unusable this
entire build. Fixed with the standard Next.js 15 bridge
(`@eslint/eslintrc`'s `FlatCompat`, wrapping the legacy
`next/core-web-vitals` + `next/typescript` shareable configs into flat
form) in `eslint.config.mjs`. Once working, it immediately found seven
real issues across the app — unescaped quotes/apostrophes in JSX text
(`react/no-unescaped-entities`), a raw `<a>` tag where `next/link`
belonged, and one genuinely unused import — none serious, but all real,
and all invisible without a working linter. Lesson: a tool that silently
no-ops (rather than erroring) on first use is worse than one that's
merely missing, because it creates false confidence that a check ran.

---

## 30. `.gitignore` was silently UTF-16 encoded the entire build

The very first thing I did in this project was rewrite `.gitignore`
(it existed but was garbled — the original `Read` showed replacement
characters and spaced-out letters, a classic UTF-16-read-as-UTF-8 tell).
I used the Write tool to replace its contents early on and moved on,
assuming that fixed it. It didn't: doing a final `git status` just now,
right before writing the README, showed `node_modules/` and `.next/`
listed as untracked (`??`) instead of silently excluded — the sign that
`.gitignore` isn't being honored at all. Checking the raw bytes
confirmed it: still UTF-16LE, the whole time, meaning every ignore rule
in it had been inert since the project started. Rewrote it via a plain
heredoc instead of the Write tool, confirmed with `file` (now reports
"ASCII text" instead of "data") and `git check-ignore -v` that
`node_modules`, `.next`, `.env`, and `prisma/dev.db` are now genuinely
excluded.

**Why this one is worth remembering specifically:** it never broke
anything visible — the app worked, `git status` "worked" (just listed
more files than it should have), nothing errored. The only way to catch
it was to actually run `git status` and read the output critically,
noticing that directories which *should* be invisible were showing up.
A silently-ignored `.gitignore` is exactly the kind of bug that survives
until the moment someone runs `git add -A && git commit` and ships a
multi-hundred-megabyte `node_modules/` folder into version control — the
cost of not catching it is entirely deferred, not eliminated.

---

## 31. `next dev` and `next build` sharing `.next/` will eventually bite you

**What happened:** right after declaring the MVP feature-complete, the
site suddenly looked "bland" — unstyled. The rendered HTML looked
correct (right classes, right structure), but the browser's network tab
told the real story: the `<link>` tag pointed at
`/_next/static/css/app/layout.css?v=...`, and that URL returned a plain
404. The dev server was serving pages referencing a CSS build artifact
that no longer existed.

**Cause:** earlier, verifying the "static vs. dynamic rendering" fix
(#28) meant running `npm run build` and `npm run start` — a real
production build — *while the `npm run dev` process was still running in
the background*. Both commands write into the same `.next/` directory,
but with incompatible internal structures (dev's incremental,
per-request compilation cache vs. build's finalized production bundle).
Once the production build overwrote `.next/`, the still-running dev
server's in-memory view of "what's on disk" went stale — new requests
kept getting served, but asset references pointed at files the
production build had since replaced or removed.

**Fix:** kill the dev server, `rm -rf .next`, restart `npm run dev` fresh
so it rebuilds its own clean cache from scratch. Confirmed with the same
method that found the bug — checking that the CSS URL a page references
actually returns real content, not just checking that the page itself
returns 200.

**The actual lesson:** `next dev` and `next build`/`next start` are
different processes with different expectations of `.next/`'s
contents, and **should never run against the same `.next/` directory
concurrently.** In hindsight, the production-build verification in #28
should have used a separate directory (Next.js supports a custom
`distDir` in `next.config.ts` for exactly this) or simply been run after
stopping the dev server, not alongside it. This is a good general
pattern to know for any dev-server-plus-build-tool setup: check whether
"verify the production build" and "keep developing" can safely share
state before assuming they can.

---

## 32. Task priority, dashboard charts, a free Accommodation tier, and a floating chat bubble

**Chosen:** Added a `priority` field (LOW/MEDIUM/HIGH, default MEDIUM) to
`ChecklistItem` — additive schema change, no data loss, every existing
row just got the default. The Dashboard gained a "This week's focus"
section (HIGH + not-done tasks, soonest due date first), donut-shaped
progress meters on the Budget-spent and Checklist-progress stat cards,
and a recommended-accommodation card. The Guest List gained a real
RSVP-breakdown pie chart. Accommodation dropped its Pro gate entirely —
free for every plan now, with a richer Pro version explicitly deferred
rather than half-built. BisaAI gained a floating chat bubble, mounted
once in `(app)/layout.tsx`, available on every app page.

**Consulted the dataviz skill before writing any chart code, as its own
trigger instructions require.** The single most useful thing it caught
early: "budget spent vs total" and "checklist progress" are each *a
single ratio against a limit* — the skill's own form-selection table
calls that a **meter**, explicitly **not** "a pie of two slices." Built
`ProgressRing.tsx` accordingly: one hue for the fill, the *same* hue at
low opacity for the track (a real ramp, not a hue-vs-gray pairing), with
the fill color shifting from green to terracotta if a ratio exceeds its
limit (over budget). The guest RSVP breakdown, by contrast, genuinely is
categorical/status data (three real states, not a single ratio), so it
earned an actual multi-slice pie chart — deliberately colored with
*status* tokens (accepted=good/green, pending=warning/gold,
declined=serious/terracotta) rather than arbitrary categorical hues,
matching the exact convention `GuestRow`'s badges already used, so the
two views of the same data never disagree with each other.

**A real hydration bug, caught by the same "click through it, don't just
type-check it" discipline as every other checkpoint in this project:**
the pie chart's first version used an SVG `<title>` child element inside
each `<circle>` for a native hover tooltip. React threw a hydration
mismatch the moment the page was actually loaded in a browser — `<title>`
is one of a handful of tag names that exist in both the HTML and SVG
namespaces, and something about how the browser's streaming HTML parser
handles it inside an SVG subtree didn't match what React's hydration
diffing expected. Fixed by dropping the `<title>` child entirely in
favor of a plain `aria-label` attribute on the `<circle>` — no child
element, no namespace ambiguity, and the chart's legend already shows
every count as plain text, so the hover tooltip was a bonus, not
something the accessibility requirement actually needed.

**A second real bug, this one plain CSS, also only visible by actually
looking at the rendered page:** the Budget-spent and Checklist-progress
rings are the exact same `ProgressRing` component with the same fixed
72px size — yet one rendered full-size and the other rendered almost
invisibly small. Cause: `StatCard`'s layout is a flex row with no
`min-width: 0` on the text block and no `flex-shrink: 0` on the ring.
Flexbox's default behavior lets a child shrink below its content size
unless told not to — the card whose text happened to be longer
("GH₵45,000.00 / of GH₵120,000.00 (38%)" vs. "31% / 9 of 29 tasks done")
squeezed its ring down to make room, purely as a side effect of string
length in unrelated sibling content. Fixed with `min-w-0` (let the text
truncate instead) and `shrink-0` (the ring never compresses). Neither
bug was visible in the code — both only showed up once the page was
actually rendered and clicked through, which is the entire reason this
project has leaned on Playwright screenshots at every checkpoint instead
of trusting `tsc`/`build` success alone.

**Repeated the `next build`-while-`next dev`-is-running mistake from #31,
immediately, and caught it myself this time.** Ran the production build
to confirm route-level static/dynamic classification (habit from #28),
forgetting the dev server from this session's Playwright testing was
still up. Recognized the exact pattern from #31 before the user had to
report broken styling again, and applied the same fix (stop dev server,
`rm -rf .next`, restart clean) proactively. Worth being honest that
writing the lesson down once didn't automatically prevent repeating the
mistake — the fix is a habit (check `netstat`/process state before
running a production build near a running dev server), not a one-time
insight.

## 33. Whole-cedi currency, and moving "add" forms to the top

**Chosen:** Four small, purely presentational requests, all about where
things live on the page rather than what the app can do. `formatGHS()`
in `lib/currency.ts` now formats with `minimumFractionDigits: 0` /
`maximumFractionDigits: 0` instead of always showing two decimal
places — GH₵45,000 instead of GH₵45,000.00. Because every page in the
app calls this one function for every money figure, it's a one-line
change with a site-wide effect, which is exactly the payoff of having a
single currency-formatting module instead of each page hand-rolling its
own `.toFixed(2)`.

The three "add a thing" forms — `AddBudgetCategoryForm`,
`AddChecklistItemForm`, `AddGuestForm` — moved from the bottom of their
page (after the table, inside the same card) to a dedicated card near
the top, directly under the page's title and description. Each form's
own root `className` used to carry `border-t border-akoma-ink/10 pt-4`
— a divider line assuming it was sitting *underneath* a table in the
same card. Moving it into its own standalone card meant that divider
was now a border floating above nothing, so it came out of all three
components, not just the page layout. This is the same lesson as always
with shared components used in exactly one place: their styling is
allowed to assume where they'll be mounted, but that assumption has to
move with them.

Guest List's form specifically had to land *between* the RSVP
stats/pie-chart row and the guest table — "under the breakdown, above
the list" — rather than at the very top like Budget's and Checklist's,
since the request was explicit that the breakdown numbers should still
be the first thing seen.

**The animated budget progress bar is a second meter, this time a bar
instead of a ring — same "one ratio against a limit" shape as
`ProgressRing` (see #32), just horizontal so it can run the full card
width instead of sitting beside a number.** Built `BudgetProgressBar.tsx`
as a client component for one specific reason: a CSS `transition` only
plays when a value *changes* after paint, not on whatever value is
already there on first render. So the component renders at `width: 0%`
on the first pass, then a `useEffect` (via `requestAnimationFrame`, so
the 0% frame actually paints before the transition starts) sets the
real percent — the resulting one-frame jump from 0 to the true value is
what makes it visibly "grow in" on page load. Reuses the exact same
green→terracotta over-budget tone logic as the dashboard's ring, so the
two views of the same number never disagree.

Verified all three pages with real Playwright screenshots (not just
`tsc`/lint) specifically to check for two things a type checker can't
see: that no `GH₵…\.\d+` pattern survived anywhere in the rendered page,
and that the moved forms actually landed in the right visual position
relative to their siblings — both confirmed correct.

## 34. Real accounts: a lightweight cookie session, not a localStorage side-channel

**Chosen:** Replaced the fully-hardcoded stub session with a real, working
(but deliberately not hardened) account layer. `src/lib/auth.ts` adds
`hashPassword`/`verifyPassword` via Node's built-in `crypto.scrypt` — real
password hashing, zero new dependencies — plus a plain `httpOnly` cookie
holding a user id (`createSession`/`destroySession`/`getSessionUserId`).
`getCurrentUser()` in `lib/session.ts` now checks that cookie first and
**falls back to the original seeded stub** if there isn't one — the exact
"additive" path LEARNING.md #5 said this would eventually take. This was
the load-bearing decision of the whole feature: every existing page
already reads the current user/wedding plan through `getCurrentUser()`/
`getCurrentWeddingPlan()`, so a real cookie session slots in underneath
all of them for free, while the seeded demo account keeps working with
zero setup exactly as before.

**Deliberately still fake, and labelled as such:** email verification (no
email is sent — `/verify-email` is a static "check your inbox" plus a
demo-only button that just flips `User.emailVerified`), forgot-password
(`/forgot-password` shows a static success message, no email, no backend
call at all), and all four social-login buttons (`SocialLoginButtons.tsx`)
are real, visibly disabled `<button>` elements with a "Soon" badge — not
silently non-functional. The session cookie itself is unsigned/
unencrypted, which is fine for a local dev demo but explicitly commented
as needing a real session library (NextAuth/JWT) before any real
deployment.

**New satellite tables, not a bloated `WeddingPlan`:** the ~45-field
onboarding wizard needed somewhere to live. Rather than add 30+ nullable
columns to `WeddingPlan` (which nothing existing expects and which every
`weddingPlan.coupleNames`-style read would have to keep ignoring), it's a
new 1:1 `CoupleProfile` model, plus a `VendorBookingStatus` table (one row
per category per wedding). `VendorBookingStatus` deliberately uses its
own `OnboardingVendorCategory` enum (12 categories: Venue, Photographer,
Videographer, Caterer, DJ/Band, MC, Decor, Florist, Makeup, Hair, Cake,
Transportation) instead of reusing the real Vendor catalog's
`VendorCategory` enum (10 categories, no Videographer/DJ/MC/Florist/Hair
split) — that enum drives actual seeded vendor listings, and bending it to
fit a self-reported onboarding checklist would have rippled through a
feature this request never touched.

**The Currency field became a diaspora flag instead — asked the user
first, didn't just decide.** The onboarding spec listed a "Currency"
question, but the project has stood on a GHS-only rule since the original
build. Rather than quietly pick a side, this went to the user directly:
keep GHS-only and add an `isDiaspora` checkbox ("planning this wedding
from abroad") that captures the real underlying need without reopening
`lib/currency.ts`, the budget page, or PDF exports.

**Dashboard personalization stayed intentionally bounded.** "Theme and
colors should personalize the dashboard" could have meant re-skinning the
whole app per-couple — instead, `WeddingStyleCard.tsx` just *displays*
the couple's theme/dress-code/palette as text and small swatches. The
five `akoma-*` brand colors stay exactly where they are: they're
load-bearing everywhere, including the dataviz-skill-validated chart
palette on this very page (see #32). Actually re-theming the UI per
couple is a real, separate feature, not a checkbox inside this one.

**A genuinely new UI layer this feature needed: `Input`/`Select`/
`Textarea`/`Field` in `components/ui/`.** Every prior form in the
codebase (`AddGuestForm`, `AddBudgetCategoryForm`, the old
`OnboardingForm`) copy-pasted the same Tailwind class string per
`<input>`. That was fine at 6 fields; at ~45 fields across a 9-step
wizard plus a matching `/profile` edit form, it stopped being fine.
Older forms were deliberately left untouched — not worth the churn of
retrofitting working code just to use the new primitive.

**A real, if odd, TypeScript inference gap:** a generic
`optionalEnum(values)` helper built on `z.union([z.literal(""),
z.enum(values)]).optional()` kept losing its literal types somewhere
in the zod→Prisma pipeline — Prisma's `create()` calls reported
`indoorOutdoor` etc. as plain `string`, not the narrow enum union, even
though the zod schema was written to produce literals. Chased it for a
few minutes, then took the reliable path instead of the elegant one:
explicit `as IndoorOutdoor | undefined`-style casts (importing the six
real Prisma enum types) at each of the dozen call sites in
`server/actions/wedding.ts` and `server/actions/profile.ts`. Correct and
boring beats chasing a generic-inference rabbit hole in code nobody else
will read closely.

**One cosmetic, non-blocking hydration warning, investigated and ruled
out as a real bug, not silently ignored.** Driving `/profile` through
Playwright logged a React hydration warning about a `style={{caret-color:
"transparent"}}` attribute appearing on every `<input>` that the server
didn't render. None of this project's code sets a `style` prop anywhere
near these inputs (`Input.tsx` only sets `className`). Confirmed it
wasn't a real bug by loading `/guests` — an older, untouched form with
the same raw-`<input>` pattern — through the identical Playwright setup:
zero hydration warnings there. The difference is that `/profile`'s
inputs arrive server-pre-filled with real values (name/email/tel-typed
fields with actual data), which is exactly the situation Chromium's
autofill-preview styling targets — a browser-injected attribute, not
anything this app's code produced. Documented rather than "fixed," since
there's no code change that would address a browser feature, and
disabling autofill site-wide to silence a testing-only artifact would
cost real users a real convenience.

## 35. Nine polish items, a rejected dependency, and two bugs only a screenshot caught

**Chosen:** A single large batch — profile pictures, sign-out moved to the
sidebar footer, a real color picker replacing free-text wedding colors,
a pricing-page visual bug, session-aware homepage nav, Pro badges hiding
once already on Pro, three-tier budget color coding with non-blocking
toast alerts, guest-list Excel import, and a scoped mobile-nav/
empty-state/loading-skeleton pass. Full detail lives in the individual
files' own comments; this entry is about the four decisions and two bugs
worth remembering.

**Rejected the obvious dependency for Excel import.** `npm install xlsx`
(SheetJS) installed clean, then `npm audit` immediately flagged it:
high-severity Prototype Pollution and a ReDoS advisory, both "No fix
available" — SheetJS stopped shipping security patches to the npm
registry and only patches their own CDN-hosted tarball now. Uninstalled
it and used `read-excel-file` instead (zero new vulnerabilities per
`npm audit`, confirmed by diffing the vulnerability list before/after).
Worth remembering: "it installed and the types looked right" is not the
same check as "it's safe to ship" — `npm audit` after every new install,
not just after `npm install` finishes without erroring.

**Avatar storage: real local files, not base64-in-the-database.** A new
route handler (`src/app/api/upload/avatar/route.ts`) writes uploads to
`public/uploads/avatars/`, validates MIME type against an allow-list, and
generates the filename entirely server-side from the signed-in user's id
— the client's original filename is never used in the path, so there's
no path-traversal surface. Explicitly commented (and here) that this is
local-disk storage for the MVP: most production hosts have an ephemeral
filesystem, so a real deployment needs S3/Cloudinary/Vercel Blob instead,
storing just the resulting URL exactly as this route already does — the
swap point is one file, same shape as the Paystack/Hubtel swap point in
`billing.ts`.

**The "Currency" field's replacement got reused as a real schema
migration, not just left as a decoration.** The color-picker request
meant `CoupleProfile.colorPalette` (free text, parsed as CSS color
keywords for the dashboard swatch) was being fully replaced by real
`primaryColor`/`secondaryColor` hex fields. Rather than leave the old
column around unused "just in case," it was dropped from the schema —
its only two call sites were both being rewritten in the same change, so
keeping it would have been exactly the kind of dead field the project's
own rule says to delete rather than deprecate-in-place.

**A budget-tone reuse, not a new color.** The three-tier budget coloring
(green/gold/terracotta at 0–60/61–80/81%+) needed a "warning" middle
tone. `akoma-gold` already reads as amber/caution everywhere else in the
app (the RSVP pie chart's Pending segment, priority badges) — reusing it
via one new `lib/budget-tone.ts` module, consumed by `ProgressRing`,
`BudgetProgressBar`, and the dashboard stat card, meant zero new design
tokens and zero risk of the three views disagreeing with each other.

**Two real bugs, both invisible to any text-based check, both only found
by actually looking at a screenshot:**

1. The pricing page's "Most Popular" badge looked like a z-index bug
   (badge behind the card's border) but wasn't — `Badge`'s "gold" tone is
   a *translucent* `bg-akoma-gold/15`, which let the card's solid 2px
   border show through wherever the pill straddled it. No z-index value
   would have fixed a transparency problem. Fixed with a one-off solid
   pill instead of the shared `Badge` component, which also sidestepped
   the Tailwind class-override-order footgun documented back in the
   FloatingChatBubble/MockBadge decision — fighting a tone's own
   background class via a later `className` is exactly the trap that
   comment warned about.
2. The new budget-alert toast (top-right, `ToastProvider.tsx`) rendered
   directly on top of the TopBar's "Upgrade to Pro" button — invisible to
   any `textContent`-based test, since the text was still "on the page,"
   just visually overlapping. Caught only by reading the actual
   screenshot pixel-for-pixel. A second, related bug surfaced the same
   way: on mobile, the same toast and the new nav drawer are both
   `position: fixed` overlays that can be open simultaneously, and since
   the toast mounts later in the JSX tree, it painted on top of the
   drawer at an equal `z-50`. Fixed by giving the drawer a higher
   `z-[60]` — an explicit user action (opening the nav) should win over a
   passive background notification — and by making the toast's width
   responsive so it doesn't overflow a narrow viewport either. Neither
   bug would have been caught by the Playwright *assertions* in this
   checkpoint's own verification script, which both technically passed;
   only looking at the rendered screenshots caught them, which is exactly
   why this project has leaned on screenshots over trusting scripted
   checks alone since LEARNING.md's very first checkpoints.

## 36. A real notification table, and a bug that was hiding in six places at once

**Chosen:** A guest-confirmed donut on the dashboard, a real in-app
notification system (bell + dropdown, unread count, mark-as-read), and —
the actual root-cause fix — centralizing "how many people is that,
really?" into one function everything else calls.

**The `+1` bug was never really one bug — it was the same bug hand-rolled
six times.** `guests.length` / `guests.filter(...).length` was
independently re-derived in the dashboard, the guest-list page, the
public share page, the full-report PDF export, and
`seatingSuggestions()` in `lib/bisaai.ts` — every single one counting
guest *rows*, never attendees, even though `Guest.plusOne` had existed in
the schema since the very first guest-list checkpoint. This is the
pattern worth remembering, not the specific fix: when a "simple" fact
(a count) is worth computing more than once, it's worth computing in
exactly one place — `lib/guests.ts`'s `calculateGuestStats()` now, so
the next new feature that needs a guest count reads from there by
construction instead of writing a seventh copy of `.filter(...).length`.
`seatingSuggestions()` was the one non-obvious casualty: it chunked
guests into tables by *row* count, so a "table of 10" could silently seat
13+ once +1s were counted — fixed with a small greedy bin-pack that
tracks seats, not rows.

**The Free-plan guest cap deliberately did NOT move to attendee counts.**
`FREE_LIMITS.maxGuests` counts *rows* — that's a business rule about how
many guest entries a Free account may create, not a statement about
headcount. Every *display* number switched to attendees; the *cap*
stayed exactly where it was. Worth being explicit about this distinction
in the code (see `lib/guests.ts`'s comment) since it's the kind of thing
a future refactor could accidentally "fix" into a real bug.

**Notifications are a real table, not computed-on-render — because
"mark as read" has to actually mean something.** The request's own
examples split into two genuinely different kinds: state-derived facts
("you're at 82% of budget," "12 pending RSVPs" — always re-derivable from
current data) and one-off events ("welcome to Akoma Planner," "your
profile was updated" — true only at the instant they happened, never
re-derivable afterward). A pure computed-list-on-every-render approach
handles the first kind fine and can't represent the second kind at all;
persisting nothing and computing everything fresh would also mean
"unread" resets on every page load, which isn't "mark as read," it's
theater. The schema's `@@unique([weddingPlanId, key])` is what lets one
function (`createNotification()`) safely serve both: state-derived
notifications upsert against a stable semantic key (`"budget-over"`,
`"vendor-PHOTOGRAPHER-not-booked"`) so re-syncing refreshes the message
without duplicating the row or resetting `isRead`; event-based ones use
a key that's unique per call (`` `profile-updated-${Date.now()}` ``) so
each real event is genuinely its own new unread row instead of silently
overwriting the last one.

**`createNotification()` is the seam, not a build-it-later TODO scattered
across five files.** Every write — computed or event-based — goes
through one function. A future email/WhatsApp/Telegram/push/SMS
integration has exactly one place to add a dispatch call, the same
"swap seam" shape as `lib/bisaai.ts`'s real-AI-provider TODOs and
`billing.ts`'s real-payment-provider TODO — documented in the schema
comment, not built, since no channel was actually asked for yet.

## 37. A real logo, and choosing hand-crafted SVGs over paid AI generation for 14 placeholders

**Chosen:** Replaced the plain "AkomaPlanner" text that stood in for a
logo since the very first checkpoint with the couple's real brand mark
(`src/assets/images/logo/logo.png`), and gave every vendor category a
placeholder image — real photo if a vendor has one (`Vendor.imageUrl`,
which had existed in the schema since the vendor catalog was first built
but was never actually rendered anywhere), an elegant category
illustration if not.

**Asked before spending real resources on 14 images.** The request
explicitly invited using AI image generation (a Higgsfield MCP tool was
available this session) "if available." Rather than just doing that
because it was technically possible, this went back to the user first:
hand-crafted SVG icons (zero cost, perfect guaranteed consistency across
all 14, matches how every other visual in this app — charts, the color
picker, all of it — is already hand-rolled with no external image
dependency) vs. AI-generated images (can look more "real," but costs
real usage on a paid external service, and 14 *separately* generated
images staying visually consistent with each other is a real risk, not
a given). The user picked hand-crafted SVGs. Worth remembering
generally: "the tool is available" and "reaching for it is the right
call" are different questions, especially once real money or an external
service is involved — that's worth a quick check-in, not a unilateral
decision, even when the request reads as an invitation.

**A real, if easy to miss, Next.js security default: local SVGs are
blocked by the image optimizer unless you opt in.** `next/image` refuses
to serve local SVG sources by default — they can embed `<script>`, a
real XSS vector for *untrusted* SVGs — so all 14 placeholders 404'd
through `/_next/image` until `next.config.ts` explicitly set
`images.dangerouslyAllowSVG: true` (plus a content-security-policy on the
image response itself). Safe here specifically because the only SVGs
ever handed to `next/image` are this app's own hand-authored files under
`src/assets/`, never a user upload — the avatar-upload route already
excludes `image/svg+xml` from its own MIME allow-list for the exact same
reason, so the two decisions reinforce rather than contradict each other.
Caught by actually loading the page and watching for failed image
requests in the network log, not by assumption — the same "run it, don't
just read the diff" habit this project has leaned on all along.

**Two category-enum lists, reconciled once, in one file.** The request's
12 vendor categories matched `ONBOARDING_VENDOR_CATEGORIES` exactly (the
onboarding wizard's own list, see LEARNING.md #34) but not the real
Vendor catalog's `VendorCategory` enum (10 values — no separate
Videographer/Florist/Hair/DJ-Band/MC). `lib/vendor-images.ts` keeps two
lookup tables, one per enum, both pointing at the same 14 image files
(plus two extra placeholders — Attire and a generic Other — added
specifically to cover the two real catalog categories the 12-item list
didn't reach) rather than trying to force one enum to serve both call
sites.

**A layout bug caught only by screenshot, again.** Adding a 24px icon to
the dashboard's Vendor Status grid (3 columns, already tight) squeezed
the status badge text into overlapping the category label — readable in
theory (`truncate` was doing something) but visually broken in practice.
Fixed by stacking icon+label above the badge instead of cramming both
onto one row. The onboarding wizard's own Vendor Status step used a
similar icon treatment but never broke, because its grid is only 2
columns with real room per row — the same component idea, two different
layouts, only one of which actually had space for it. Another entry in
the growing list of bugs this project has only ever found by looking at
a rendered screenshot, never by a passing assertion.

## 38. Vendor card overlap fix, a vendor plan filter, dashboard re-weighting, and a real Accommodation model

**The bug:** `VendorCard`'s "Compare" checkbox was `position: absolute`,
placed as the first element in the JSX back when it was the first visual
content on the card. The vendor-image checkpoint (#37) added an image
*above* it in render order without touching the checkbox's positioning —
so it kept floating at the same absolute coordinates, which now landed on
top of the image instead of the text below it. Fixed by rebuilding the
card without `position: absolute` at all: image fills a fixed-height top
section (`h-44 w-full`, `object-cover`), everything else — name, rating,
description, price, "View details" / Compare — flows normally underneath,
Compare included, so nothing can drift out of place the next time the
card's contents change order again. Deliberately not built on the shared
`<Card>` component, same reasoning as before (see #37/earlier entries on
Tailwind's class-order footgun) — `<Card>` bakes in its own padding and
this card needs the image flush to all four edges of its top section.

**Vendor plan filter is a listing property, not a viewer permission.**
The new "All vendors / Free / Pro" filter on `/vendors` filters by
`Vendor.isProFeatured` — whether *that vendor's listing* is Pro-tier —
which is a completely different flag from `locked`, which is whether
*the viewer's own account* is on Free and therefore can't see pricing/
contact details. A Free-plan viewer filtering to "Pro" still sees locked
cards; a Pro-plan viewer filtering to "Free" sees full unlocked cards.
Conflating the two would have quietly broken the paywall.

**Dashboard: 2/3 + 1/3 instead of three equal columns.** Vendor Status,
Guest Confirmed, and Wedding Style used to flex between 2 and 3 equal
columns depending on whether style info existed. Re-weighted to
`lg:grid-cols-3` with Vendor Status spanning `col-span-2` and Guest
Confirmed + Wedding Style stacked in the remaining column, because vendor
booking is the task couples actually return to most — the other two are
glanceable status, not something you interact with each visit. Vendor
Status's own category grid picked up a `lg:grid-cols-4` step to use the
extra width usefully instead of leaving whitespace.

**Accommodation went from a bare list to a real model.** `description`,
`rating`, and `amenities` (comma-separated, same convention as
`WeddingPlan.tradition` — a real amenities taxonomy is more structure
than an MVP booking-adjacent list needs) were added to the schema, and
`imageUrl` for the same "real photo wins, else a placeholder" pattern as
`Vendor.imageUrl`. Accommodations have no category enum the way vendors
do, so `lib/accommodation-images.ts` can't key placeholders off a
category — instead it hashes the listing's `id` to deterministically
pick one of four property-style SVGs (hotel/guesthouse/boutique/resort).
Deterministic-by-id beats random-on-render for a boring but important
reason: a listing's placeholder can't flicker to a different image on
every re-render or navigation, since nothing about the hash input
changes between requests. Seed data grew from 6 accommodations to 12 (6
per city) so the new grid layout had enough real content to actually
look like a listings page instead of two lonely cards.
