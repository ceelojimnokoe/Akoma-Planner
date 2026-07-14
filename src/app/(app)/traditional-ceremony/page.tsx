// src/app/(app)/traditional-ceremony/page.tsx
//
// Pass tool: a real per-couple tracked workspace for customary marriage
// requirements — replaces the old read-only /traditional-list pricing
// reference (see prisma/schema.prisma's TraditionalCeremonyItem comment
// for why this needed a genuinely new model, not a rename). Total Budget
// here is read-only, sourced one-way from the Budget page's "Traditional
// Customary" category (matchBudgetCategoryByName) — editing that
// allocation happens on /budget; spentGHS flows the other direction (see
// server/actions/traditional-ceremony.ts's sync).

import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { requirePass } from "@/lib/plan";
import { matchBudgetCategoryByName } from "@/lib/budget-fit";
import { calculateBudgetSummary } from "@/lib/budget";
import { getBudgetTone } from "@/lib/budget-tone";
import { getChecklistTone } from "@/lib/checklist-tone";
import { formatGHS } from "@/lib/currency";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { UpgradePrompt } from "@/components/upgrade/UpgradePrompt";
import { AddTraditionalCeremonyItemForm } from "@/components/traditional-ceremony/AddTraditionalCeremonyItemForm";
import { TraditionalCeremonyItemRow } from "@/components/traditional-ceremony/TraditionalCeremonyItemRow";
import { TRADITIONAL_CUSTOMARY_BUDGET_NAME } from "@/lib/traditional-ceremony-defaults";

export default async function TraditionalCeremonyPage() {
  const weddingPlan = await getCurrentWeddingPlan();
  const gate = requirePass(weddingPlan!, "Traditional Ceremony");

  const [items, budgetCategories] = gate.allowed
    ? await Promise.all([
        prisma.traditionalCeremonyItem.findMany({ where: { weddingPlanId: weddingPlan!.id }, orderBy: { createdAt: "asc" } }),
        prisma.budgetCategory.findMany({ where: { weddingPlanId: weddingPlan!.id } }),
      ])
    : [[], []];

  const matchedBudgetCategory = matchBudgetCategoryByName(TRADITIONAL_CUSTOMARY_BUDGET_NAME, budgetCategories);
  const totalBudgetGHS = matchedBudgetCategory?.allocatedGHS ?? 0;
  const summary = calculateBudgetSummary(totalBudgetGHS, items);

  const doneItemMeta = new Map(items.map((i) => [i.id, { category: i.category, done: i.done }]));
  const itemSummaries = summary.categories.map((c) => ({ ...c, ...doneItemMeta.get(c.id)! }));

  const doneCount = items.filter((i) => i.done).length;
  const itemCompletionPercent = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-akoma-ink">Traditional Ceremony</h1>
        <p className="mt-1 text-sm text-akoma-ink/60">
          Track the customary items your ceremony needs — what&apos;s been acquired, what&apos;s outstanding, and what it costs.
        </p>
      </div>

      {!gate.allowed ? (
        <UpgradePrompt reason={gate.upgradeReason} />
      ) : !matchedBudgetCategory ? (
        <Card>
          <p className="text-sm text-akoma-ink/70">
            Add a &quot;{TRADITIONAL_CUSTOMARY_BUDGET_NAME}&quot; category on your Budget page to set a total budget for this list — it
            will appear here automatically.
          </p>
          <LinkButton href="/budget" variant="ghost" size="sm" className="mt-3">
            Go to Budget →
          </LinkButton>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Item completion"
              value={`${doneCount} / ${items.length}`}
              subtext={`${itemCompletionPercent}%`}
              ring={{ percent: itemCompletionPercent, tone: getChecklistTone(itemCompletionPercent) }}
            />
            <StatCard
              label="Budget usage"
              value={formatGHS(summary.totalSpentGHS)}
              subtext={`of ${formatGHS(summary.totalBudgetGHS)} spent (${Math.round(summary.percentSpent)}%)`}
              ring={{ percent: summary.percentSpent, tone: getBudgetTone(summary.percentSpent) }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total budget" value={formatGHS(summary.totalBudgetGHS)} subtext="Set on the Budget page" />
            <StatCard label="Spent" value={formatGHS(summary.totalSpentGHS)} />
            <StatCard
              label="Remaining"
              value={formatGHS(summary.remainingGHS)}
              valueTone={summary.remainingGHS < 0 ? "terracotta" : "neutral"}
              subtext={summary.remainingGHS < 0 ? "Over budget" : "Left to spend"}
            />
          </div>

          <Card>
            <AddTraditionalCeremonyItemForm weddingPlanId={weddingPlan!.id} />
          </Card>

          <Card>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-akoma-ink/10 text-xs uppercase tracking-wide text-akoma-ink/40">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Allocated</th>
                  <th className="pb-2 font-medium">Spent</th>
                  <th className="pb-2 font-medium">Remaining</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-akoma-ink/5">
                {itemSummaries.map((item) => (
                  <TraditionalCeremonyItemRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>

            {itemSummaries.length === 0 && (
              <p className="py-6 text-center text-sm text-akoma-ink/50">No items yet — add one above.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
