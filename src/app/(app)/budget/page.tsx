// src/app/(app)/budget/page.tsx
//
// The full Budget tool: summary numbers plus an editable table of every
// category. Free-tier feature, no gating. All the math comes from
// lib/budget.ts — this page's job is only to fetch data and render it.

import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { calculateBudgetSummary } from "@/lib/budget";
import { matchBudgetCategoryByName } from "@/lib/budget-fit";
import { formatGHS } from "@/lib/currency";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { BudgetCategoryRow } from "@/components/budget/BudgetCategoryRow";
import { AddBudgetCategoryForm } from "@/components/budget/AddBudgetCategoryForm";
import { BudgetProgressBar } from "@/components/budget/BudgetProgressBar";
import { BudgetAlertWatcher } from "@/components/budget/BudgetAlertWatcher";
import { TRADITIONAL_CUSTOMARY_BUDGET_NAME } from "@/lib/traditional-ceremony-defaults";

export default async function BudgetPage() {
  const weddingPlan = await getCurrentWeddingPlan();
  const categories = await prisma.budgetCategory.findMany({
    where: { weddingPlanId: weddingPlan!.id },
    orderBy: { createdAt: "asc" },
  });

  const summary = calculateBudgetSummary(weddingPlan!.totalBudgetGHS, categories);
  const traditionalCustomaryId = matchBudgetCategoryByName(TRADITIONAL_CUSTOMARY_BUDGET_NAME, categories)?.id;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-akoma-ink">Budget</h1>
        <p className="mt-1 text-sm text-akoma-ink/60">
          Every figure here is in GHS and editable — this is your working budget, not a locked estimate.
        </p>
      </div>

      <BudgetAlertWatcher weddingPlanId={weddingPlan!.id} percentSpent={summary.percentSpent} />

      <Card>
        <AddBudgetCategoryForm weddingPlanId={weddingPlan!.id} />
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total budget" value={formatGHS(summary.totalBudgetGHS)} />
        <StatCard label="Allocated" value={formatGHS(summary.totalAllocatedGHS)} subtext={`${formatGHS(summary.unallocatedGHS)} unallocated`} />
        <StatCard label="Spent" value={formatGHS(summary.totalSpentGHS)} subtext={`${Math.round(summary.percentSpent)}% of budget`} />
        <StatCard
          label="Remaining"
          value={formatGHS(summary.remainingGHS)}
          subtext={summary.remainingGHS < 0 ? "Over budget" : "Left to spend"}
        />
      </div>

      <Card>
        <BudgetProgressBar spentGHS={summary.totalSpentGHS} totalGHS={summary.totalBudgetGHS} percent={summary.percentSpent} />
      </Card>

      <Card>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-akoma-ink/10 text-xs uppercase tracking-wide text-akoma-ink/40">
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium">Allocated</th>
              <th className="pb-2 font-medium">Spent</th>
              <th className="pb-2 font-medium">Remaining</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-akoma-ink/5">
            {summary.categories.map((c) => (
              <BudgetCategoryRow key={c.id} category={c} spentDerivedFrom={c.id === traditionalCustomaryId ? "Traditional Ceremony" : undefined} />
            ))}
          </tbody>
        </table>

        {summary.categories.length === 0 && (
          <p className="py-6 text-center text-sm text-akoma-ink/50">
            No budget categories yet — add one above.
          </p>
        )}
      </Card>
    </div>
  );
}
