// src/app/(app)/honeymoon/page.tsx
//
// Pass tool: destination/style setup, a standalone budget (never linked
// to the main Budget page — see HoneymoonPlan's schema comment), and a
// fixed default checklist. HoneymoonPlanForm doubles as both the
// first-time setup form and the later-edit form (createOrUpdateHoneymoonPlan
// is an upsert), so there's no separate UI state for "not set up yet."

import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { requirePass } from "@/lib/plan";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UpgradePrompt } from "@/components/upgrade/UpgradePrompt";
import { HoneymoonPlanForm } from "@/components/honeymoon/HoneymoonPlanForm";
import { HoneymoonBudgetTracker } from "@/components/honeymoon/HoneymoonBudgetTracker";
import { HoneymoonChecklist } from "@/components/honeymoon/HoneymoonChecklist";

export default async function HoneymoonPage() {
  const weddingPlan = await getCurrentWeddingPlan();
  const gate = requirePass(weddingPlan!, "Honeymoon Planner");

  const [honeymoonPlan, checklistItems] = gate.allowed
    ? await Promise.all([
        prisma.honeymoonPlan.findUnique({ where: { weddingPlanId: weddingPlan!.id } }),
        prisma.honeymoonChecklistItem.findMany({ where: { weddingPlanId: weddingPlan!.id }, orderBy: { createdAt: "asc" } }),
      ])
    : [null, []];

  const styles = honeymoonPlan?.styles ? honeymoonPlan.styles.split(", ").filter(Boolean) : [];
  const doneCount = checklistItems.filter((i) => i.done).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-akoma-ink">Honeymoon</h1>
        <p className="mt-1 text-sm text-akoma-ink/60">
          Your own trip, your own budget — kept separate from the main wedding budget on purpose.
        </p>
      </div>

      {!gate.allowed ? (
        <UpgradePrompt reason={gate.upgradeReason} />
      ) : (
        <>
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-akoma-ink">Trip details</h2>
              {honeymoonPlan?.destination && <Badge tone="info">{honeymoonPlan.destination}</Badge>}
            </div>
            <HoneymoonPlanForm weddingPlanId={weddingPlan!.id} initialDestination={honeymoonPlan?.destination ?? ""} initialStyles={styles} />
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold text-akoma-ink">Honeymoon budget</h2>
            <HoneymoonBudgetTracker
              weddingPlanId={weddingPlan!.id}
              allocatedGHS={honeymoonPlan?.allocatedGHS ?? 0}
              spentGHS={honeymoonPlan?.spentGHS ?? 0}
            />
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-akoma-ink">Planning checklist</h2>
              <span className="text-xs text-akoma-ink/50">
                {doneCount} / {checklistItems.length} done
              </span>
            </div>
            <HoneymoonChecklist items={checklistItems} />
          </Card>
        </>
      )}
    </div>
  );
}
