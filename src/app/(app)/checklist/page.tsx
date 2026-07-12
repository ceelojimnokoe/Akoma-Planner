// src/app/(app)/checklist/page.tsx
//
// The Checklist tool: default Ghana-relevant tasks plus any custom ones,
// grouped by category, with a progress summary. Free-tier feature — the
// one Pass distinction (unlimited custom tasks vs. a capped number) is
// enforced in the addChecklistItem server action, not here.

import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { DEFAULT_CHECKLIST_TEMPLATE } from "@/lib/checklist-defaults";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { ChecklistItemRow } from "@/components/checklist/ChecklistItemRow";
import { AddChecklistItemForm } from "@/components/checklist/AddChecklistItemForm";

export default async function ChecklistPage() {
  const weddingPlan = await getCurrentWeddingPlan();
  // nulls: "last" matters here — without it, undated custom tasks sort
  // *before* overdue dated tasks (SQLite/most DBs treat NULL as the
  // smallest value in ASC order), which would bury the most urgent items.
  const items = await prisma.checklistItem.findMany({
    where: { weddingPlanId: weddingPlan!.id },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }],
  });

  const doneCount = items.filter((i) => i.done).length;
  const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const overdueCount = items.filter((i) => !i.done && i.dueDate && i.dueDate < new Date()).length;

  const categoryOrder = [...new Set(DEFAULT_CHECKLIST_TEMPLATE.map((t) => t.category))];
  const categories = [...new Set(items.map((i) => i.category))].sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );
  const knownCategories = [...new Set([...categoryOrder, ...categories])];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-akoma-ink">Checklist</h1>
        <p className="mt-1 text-sm text-akoma-ink/60">
          Default tasks are timed against your wedding date — add your own alongside them.
        </p>
      </div>

      <Card>
        <AddChecklistItemForm weddingPlanId={weddingPlan!.id} categories={knownCategories} />
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Progress" value={`${percent}%`} subtext={`${doneCount} of ${items.length} done`} />
        <StatCard label="Overdue" value={String(overdueCount)} subtext={overdueCount ? "Needs attention" : "All caught up"} />
        <StatCard label="Total tasks" value={String(items.length)} />
      </div>

      {categories.map((category) => {
        const categoryItems = items.filter((i) => i.category === category);
        return (
          <Card key={category}>
            <h2 className="mb-2 font-semibold text-akoma-ink">{category}</h2>
            <ul className="divide-y divide-akoma-ink/5">
              {categoryItems.map((item) => (
                <ChecklistItemRow key={item.id} item={item} />
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
