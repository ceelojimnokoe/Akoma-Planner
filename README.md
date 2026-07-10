# AkomaPlanner

A wedding-planning web app for the Ghanaian market, with an in-app AI assistant, **BisaAI**. Built as a learning project — see [LEARNING.md](./LEARNING.md) for a decision-by-decision log of what was chosen, what the alternatives were, and why (useful for study/interview prep, not just as changelog).

This is an MVP: real UI, a real local database, working free-tier features, and every AI/payment integration point clearly stubbed and labelled — see [What's real vs. stubbed](#whats-real-vs-stubbed) below before treating anything here as launch-ready.

## Quick start

```bash
npm install
cp .env.example .env        # defaults work as-is for local dev — no real keys needed
npm run db:push             # create the local SQLite database from prisma/schema.prisma
npm run db:seed             # populate it with sample vendors, a sample wedding, etc.
npm run dev                 # http://localhost:3000
```

Other useful commands:

```bash
npm run build && npm run start   # production build + serve (see note below on why this matters)
npm test                         # Vitest — runs the pure-function test suite (lib/budget.ts, lib/dates.ts)
npm run lint                     # ESLint
npm run db:studio                # Prisma Studio — browse/edit the local DB in a GUI
npm run db:reset                 # wipe and re-seed the database
```

**Always run `npm run build` before trusting a change is done, not just `npm run dev`.** This project hit a real bug where every data-driven page was silently getting statically prerendered at build time (see `LEARNING.md` #28) — dev mode never surfaces that class of issue because it always renders fresh regardless of a route's static/dynamic classification.

Real sign-up/log-in now exists (see [Auth](#auth) below) — but `npm run db:seed` also creates a seeded demo account (`ama.owusu@example.com` / `akomaplanner-demo`) with one fully-populated sample wedding, so every screen has real content immediately even before you create your own account.

## Tech stack

- **Next.js 15 (App Router) + TypeScript + Tailwind CSS**
- **SQLite via Prisma** for local data, structured to be a config change away from hosted Postgres (see `LEARNING.md` #3)
- **Vitest** for the pure-function test suite (`tests/`)
- **Playwright** (dev dependency) — used throughout the build to click through and verify features against a real browser; not part of the running app
- **pdf-lib** for the PDF export feature (no headless browser needed at request time)

## Project structure

```
prisma/
  schema.prisma          # the data model — see its header comments for the SQLite→Postgres portability notes
  seed.ts                # sample Ghana-relevant data: vendors, traditional-list items, accommodations, one sample wedding

src/
  app/
    page.tsx             # public landing page
    pricing/              # pricing + Free/Pro comparison
    checkout/             # stubbed checkout (see below)
    onboarding/            # wedding setup wizard
    w/[shareToken]/        # public read-only shared wedding page
    (app)/                # everything behind the app shell (sidebar/topbar) — dashboard, budget, checklist,
                           # guests, vendors, bisaai, calendar, traditional-list, accommodation, collaboration,
                           # design, dress-tryon, settings
    api/export/            # PDF export route handlers (real file downloads, not Server Actions)

  components/             # organized by feature, one folder per app section, plus ui/ (Button, Card, Badge)
                           # and pro/ (UpgradePrompt — the standard "this is a Pro feature" block)

  lib/                    # the service layer: business logic + data access, no React in here.
                           # bisaai.ts is the one to read first — see below.

  server/actions/         # thin "use server" glue: validate input, call lib/, done.
                           # Mutations live here, never directly in components.
```

`LEARNING.md` explains the reasoning behind this shape in detail (`lib/` vs `server/actions/` split, why Server Actions instead of a separate API, etc.) — worth reading before extending the app.

## Where the BisaAI stubs live

**`src/lib/bisaai.ts`** is the single file every AI-flavored feature routes through — thirteen typed functions (`basicQA`, `sourceVendors`, `draftVendorMessage`, `draftNegotiationMessage`, `priceTraditionalList`, `generateShoppingList`, `dressTryOn`, `decorMoodboard`, `generateTimeline`, `seatingSuggestions`, `honeymoonRecommendations`, `suggestHashtags`, `generateSocialPost`, `draftEmailInvite`). Every one of them is a mock today — no network call to a real model provider happens anywhere in this codebase — and every one has a `REAL INTEGRATION TODO` comment describing exactly what a real implementation would do.

Two structural rules are worth understanding before touching this file (both explained in full in the file's own header comment and in `LEARNING.md` #12):

1. **This file can only write to `AIInteractionLog`** (a pure audit trail). It never writes to `VendorInterest`, `Guest`, `BudgetCategory`, or anywhere else — drafting a vendor message returns text; only a human-triggered Server Action in `src/server/actions/vendors.ts` can turn that into a sent message or an accepted quote.
2. **This file has no concept of Free vs. Pro.** Plan gating happens one layer up, in `src/lib/plan.ts`'s `requirePro()`, called by whichever Server Action invokes a `bisaai.ts` function.

## What's real vs. stubbed

Read this before considering any part of this app launch-ready.

| Area | Status | What a real version needs |
|---|---|---|
| **AI (BisaAI)** | All 13 functions in `lib/bisaai.ts` are mocks — keyword lookups, templated text, or fixed catalogs, each clearly labelled (`meta.isMock`, `MockBadge` in the UI) | Replace each function body with a real model call (OpenAI/Anthropic — see `BISAAI_PROVIDER`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` in `.env.example`). Keep the same input/output shapes and nothing above `lib/bisaai.ts` needs to change. |
| **Dress try-on** | Experimental stub — returns a static placeholder SVG, never processes the uploaded photo (the function signature doesn't even accept photo bytes) | Needs a real image-generation provider, a signed-upload flow, and an explicit photo-retention policy. See the header comment on `dressTryOn()`. |
| **Payments** | Fully stubbed — `/checkout` has no payment fields at all, one button that immediately flips the plan to Pro | Needs Paystack or Hubtel Mobile Money integration (env vars already scaffolded: `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `HUBTEL_CLIENT_ID`, `HUBTEL_CLIENT_SECRET`). Critically: a real integration must flip the plan from a **webhook** that verifies payment, never from a client-triggered action like the current stub. See `src/server/actions/billing.ts`. |
| **Auth** | Real but lightweight — `/signup` and `/login` create real accounts and verify real password hashes (`crypto.scrypt`, see `lib/auth.ts`), but the session cookie is unsigned and there's no email verification, password reset, or OAuth (all three exist as clearly-labelled placeholder pages) | Needs a real session library (NextAuth/Auth.js or a signed JWT), a transactional email provider for verification/reset, and real OAuth apps for the four social buttons already in the UI. See `LEARNING.md` #34. |
| **Vendor data** | 38 realistic but fictional seeded vendors across Accra/Kumasi (`prisma/seed.ts`) | Needs a real, maintained vendor dataset — either a manual admin/CMS flow or a real sourcing pipeline. |
| **Vendor negotiation** | Fully real (not stubbed) — the DRAFT → SENT → QUOTED → ACCEPTED/DECLINED lifecycle actually persists to the database and is enforced by which Server Actions are allowed to write which status | No changes needed structurally; works as designed once real AI drafting is wired in. |
| **Budget, checklist, guests, calendar, export** | Fully real — no mocks, real CRUD against the local database | None — these work as a real product today. |
| **Traditional list / shopping list pricing** | Real local reference data (`TraditionalListItem` table), aggregated by real code — not AI-invented, but not live market data either | Needs a process for keeping the seeded price ranges current. |

## Testing

`tests/` has Vitest coverage for the pure-function logic in `lib/`: the budget calculator (`lib/budget.ts`) and the calendar month-grid math (`lib/dates.ts`). Both were chosen because they involve fiddly float/date arithmetic where a quick test catches real bugs before they reach the UI — see `LEARNING.md` #11, #16, and #21 for the actual bugs each one caught during development.

Run with `npm test` (or `npm run test:watch` while developing).

## Auth

`/signup` and `/login` create and verify real accounts — real password hashing via Node's built-in `crypto.scrypt` (`src/lib/auth.ts`), a real (but unsigned, not production-hardened) session cookie. `src/lib/session.ts`'s `getCurrentUser()` checks that cookie first and falls back to the same seeded stub account as before (`ama.owusu@example.com`, created by `prisma/seed.ts`) if there isn't one — so the seeded demo keeps working with zero setup. Every page and Server Action that needs "the current user" calls `getCurrentUser()`/`getCurrentWeddingPlan()`, so this was a drop-in change under existing call sites, not a rewrite of them.

Still explicitly not built: email verification (`/verify-email` is a static placeholder with a demo-only "I've verified" shortcut), password reset (`/forgot-password` shows a static success message, no email sent), and the four social login buttons (visibly disabled, labelled "Soon"). See `LEARNING.md` #34.

## License

Private/unpublished — no license granted.
