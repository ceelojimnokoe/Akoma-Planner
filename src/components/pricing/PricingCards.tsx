// src/components/pricing/PricingCards.tsx
//
// The Free/Pro comparison, with the Monthly/Yearly/One-time toggle. A
// Client Component because the toggle needs to update the Pro card's
// price and the checkout link's ?interval= param instantly.
//
// Feature lists below are deliberately scoped to what this app actually
// does — see LEARNING.md for the two spec'd bullets ("full cloud
// backup/restore", "unlimited AI image generation") intentionally left
// off, since neither exists anywhere in the product and listing them
// would violate the project's own "don't overstate capabilities" rule.

"use client";

import { useState } from "react";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PRICING, type BillingInterval } from "@/lib/pricing";
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

const PRO_FEATURES = [
  "All advanced BisaAI tools (drafting, pricing estimates, shopping lists, timelines, seating & more)",
  "Unlimited weddings, guests, budget categories & checklist tasks",
  "Full vendor management: comparison view, quote tracking, negotiation drafts",
  "Collaboration: add your fiancé(e) or planner, shareable wedding page",
  "Design tools: timelines, invitation templates, seating charts",
  "Decor moodboard & dress try-on preview (experimental)",
  "Fuller PDF export: schedule, budget breakdown & guest summary",
];

export function PricingCards() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const price = PRICING[interval];

  return (
    <div>
      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-full border border-akoma-ink/10 bg-white p-1">
          {(Object.keys(PRICING) as BillingInterval[]).map((key) => (
            <button
              key={key}
              onClick={() => setInterval(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                interval === key ? "bg-akoma-green text-white" : "text-akoma-ink/60 hover:text-akoma-ink"
              }`}
            >
              {PRICING[key].label}
            </button>
          ))}
        </div>
      </div>

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

        <div className="relative rounded-2xl border-2 border-akoma-gold bg-white p-6">
          <Badge tone="gold" className="absolute -top-3 left-6">
            Most Popular
          </Badge>
          <h2 className="font-semibold text-akoma-ink">AkomaPlanner Pro</h2>
          <p className="mt-1 text-3xl font-bold text-akoma-ink">
            {formatGHS(price.amountGHS)} <span className="text-base font-normal text-akoma-ink/50">{price.suffix}</span>
          </p>
          <p className="text-sm text-akoma-ink/50">{price.label}</p>
          <ul className="mt-5 space-y-2.5 text-sm text-akoma-ink/70">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-akoma-gold">✓</span> {f}
              </li>
            ))}
          </ul>
          <LinkButton href={`/checkout?interval=${interval}`} variant="secondary" className="mt-6 w-full justify-center">
            Upgrade to Pro
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
