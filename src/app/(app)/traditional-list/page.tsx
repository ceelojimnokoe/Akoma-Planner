// src/app/(app)/traditional-list/page.tsx
//
// Dedicated Pass screen wrapping lib/bisaai.ts's priceTraditionalList().
// Unlike the BisaAI hub's opt-in tool cards, this page's whole purpose
// *is* showing this data, so it loads and calls priceTraditionalList()
// directly on render — same "just show the data" pattern as the Vendors
// or Budget pages, not a click-to-generate widget.

import { getCurrentWeddingPlan } from "@/lib/session";
import { requirePass } from "@/lib/plan";
import { priceTraditionalList } from "@/lib/bisaai";
import { formatGHS } from "@/lib/currency";
import { Card } from "@/components/ui/Card";
import { Badge, EstimateBadge } from "@/components/ui/Badge";
import { UpgradePrompt } from "@/components/upgrade/UpgradePrompt";
import type { City } from "@prisma/client";

export default async function TraditionalListPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city: cityParam } = await searchParams;
  const weddingPlan = await getCurrentWeddingPlan();
  const gate = requirePass(weddingPlan!, "The traditional list pricing tool");

  const city = (cityParam as City) ?? weddingPlan!.city;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-akoma-ink">Traditional List Pricing</h1>
        <p className="mt-1 text-sm text-akoma-ink/60">
          Estimated costs for drinks, kente, and customary gifts, by market.
        </p>
      </div>

      {!gate.allowed ? (
        <UpgradePrompt reason={gate.upgradeReason} />
      ) : (
        <TraditionalListContent weddingPlanId={weddingPlan!.id} city={city} />
      )}
    </div>
  );
}

async function TraditionalListContent({ weddingPlanId, city }: { weddingPlanId: string; city: City }) {
  const result = await priceTraditionalList({ weddingPlanId, city });
  if (!result.ok) {
    return <p className="text-sm text-akoma-terracotta">{result.error}</p>;
  }

  const { itemsByCategory, totalEstimateLowGHS, totalEstimateHighGHS } = result.data;

  return (
    <>
      <form method="get" className="flex items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Market / city</label>
          <select
            name="city"
            defaultValue={city}
            className="rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
          >
            <option value="ACCRA">Accra</option>
            <option value="KUMASI">Kumasi</option>
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-akoma-green px-4 py-2 text-sm font-medium text-white hover:bg-akoma-green/90">
          Update
        </button>
      </form>

      <Card>
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm text-akoma-ink/60">Estimated total</p>
          <EstimateBadge />
        </div>
        <p className="text-2xl font-semibold text-akoma-ink">
          {formatGHS(totalEstimateLowGHS)} – {formatGHS(totalEstimateHighGHS)}
        </p>
        <p className="mt-2 text-xs text-akoma-ink/50">
          {result.meta.disclaimer}
        </p>
      </Card>

      {Object.keys(itemsByCategory).length === 0 && (
        <p className="py-8 text-center text-sm text-akoma-ink/50">No traditional list items priced for this market yet.</p>
      )}

      {Object.entries(itemsByCategory).map(([category, items]) => (
        <Card key={category}>
          <h2 className="mb-3 font-semibold text-akoma-ink">{category}</h2>
          <ul className="divide-y divide-akoma-ink/5">
            {items.map((item) => (
              <li key={item.itemName} className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-akoma-ink">{item.itemName}</p>
                    <p className="text-xs text-akoma-ink/50">{item.market}</p>
                    {item.notes && <p className="mt-1 text-xs text-akoma-ink/40">{item.notes}</p>}
                  </div>
                  <Badge tone="info" className="shrink-0">
                    {formatGHS(item.estLowGHS)}–{formatGHS(item.estHighGHS)}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </>
  );
}
