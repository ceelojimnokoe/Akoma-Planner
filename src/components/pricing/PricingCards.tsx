// src/components/pricing/PricingCards.tsx
//
// The Free/Wedding Pass comparison. No tabs, no billing-interval toggle —
// the Pass is a single one-time price, not a subscription, so there's
// nothing to switch between. A plain Server Component now (the old
// Monthly/Yearly toggle was the only reason this needed client state).
//
// Feature lists below are deliberately scoped to what this app actually
// does. The Pass leads with what's real and working today (Design Tools,
// Traditional List pricing, vendor access, Collaboration, Dress Try-On);
// BisaAI's Pro tools get their own separate "coming soon" strip rather
// than being mixed into the headline bullets, since they're currently
// mocked — see LEARNING.md for why overstating capabilities anywhere in
// the UI, especially the page someone pays money on, isn't done here.
// "Unlimited weddings" isn't listed — most couples plan exactly one
// wedding, and this app isn't aimed at professional planners.

import { LinkButton } from "@/components/ui/Button";
import { WEDDING_PASS_AMOUNT_GHS } from "@/lib/pricing";
import { formatGHS } from "@/lib/currency";

const FREE_FEATURES = [
  "1 wedding plan",
  "Basic checklists",
  "Up to 100 guests",
  "Simple budget calculator",
  "Basic vendor recommendations",
  "Basic BisaAI Q&A",
  "Mobile + desktop",
  "Export simple schedule PDF",
];

const PASS_FEATURES = [
  "Design tools: timelines, invitation templates, seating charts",
  "Traditional list pricing (drinks, kente, customary gifts), by market",
  "Full vendor access: comparison view, quote tracking, negotiation drafts",
  "Collaboration: add your fiancé(e) or planner, shareable wedding page",
  "Dress try-on preview (experimental)",
  "Unlimited guests, budget categories & checklist tasks",
  "Fuller PDF export: schedule, budget breakdown & guest summary",
];

const COMING_SOON_FEATURES = [
  "AI shopping lists",
  "Decor moodboard generation",
  "Honeymoon recommendations",
  "Hashtag & social post drafts",
  "Email invite drafting",
];

export function PricingCards() {
  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-akoma-ink/10 bg-white p-6">
          <h2 className="font-semibold text-akoma-ink">AkomaPlanner Basic</h2>
          <p className="mt-1 text-3xl font-bold text-akoma-ink">Free</p>
          <p className="text-sm text-akoma-ink/50">Fully usable, no payment required</p>
          <ul className="mt-5 space-y-2.5 text-sm text-akoma-ink/70">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-akoma-green">✓</span> {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border-2 border-akoma-gold bg-white p-6">
          <h2 className="font-semibold text-akoma-ink">Wedding Pass</h2>
          <p className="mt-1 text-3xl font-bold text-akoma-ink">
            {formatGHS(WEDDING_PASS_AMOUNT_GHS)} <span className="text-base font-normal text-akoma-ink/50">one-time</span>
          </p>
          <p className="text-sm text-akoma-ink/50">
            Pay once. Yours through the wedding and after. No subscription, nothing to cancel.
          </p>
          <ul className="mt-5 space-y-2.5 text-sm text-akoma-ink/70">
            {PASS_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-akoma-gold">✓</span> {f}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg bg-akoma-ink/5 px-3 py-2.5 text-xs text-akoma-ink/60">
            <p className="mb-1.5 font-medium text-akoma-ink/70">Coming soon, included when it ships:</p>
            <p>{COMING_SOON_FEATURES.join(" · ")}</p>
          </div>
          <LinkButton href="/checkout" variant="secondary" className="mt-6 w-full justify-center">
            Get the Wedding Pass
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
