// src/app/(app)/dress-tryon/page.tsx
//
// Pro, experimental. See safe rule #2 in the project brief and the
// header comment on lib/bisaai.ts's dressTryOn() — this page's job is
// mostly to make that rule visible: consent required, disclaimer always
// on screen, and it's clearly labelled a stub throughout.

import { getCurrentWeddingPlan } from "@/lib/session";
import { requirePass } from "@/lib/plan";
import { Card } from "@/components/ui/Card";
import { UpgradePrompt } from "@/components/pro/UpgradePrompt";
import { DressTryOnForm } from "@/components/dress-tryon/DressTryOnForm";

export default async function DressTryOnPage() {
  const weddingPlan = await getCurrentWeddingPlan();
  const gate = requirePass(weddingPlan!, "Dress try-on");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-akoma-ink">Dress Try-On</h1>
        <p className="mt-1 text-sm text-akoma-ink/60">An experimental, approximate preview — not a shopping tool.</p>
      </div>

      {!gate.allowed ? (
        <UpgradePrompt reason={gate.upgradeReason} />
      ) : (
        <Card>
          <DressTryOnForm weddingPlanId={weddingPlan!.id} />
        </Card>
      )}
    </div>
  );
}
