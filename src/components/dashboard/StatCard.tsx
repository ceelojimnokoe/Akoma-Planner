// src/components/dashboard/StatCard.tsx
//
// One number, labelled, in a card. The dashboard's basic building block —
// deliberately dumb (no logic), so all the actual calculation happens in
// the page/lib layer where it can be tested and reused.
//
// `ring` is optional: when a stat is a ratio against a limit (budget
// spent, checklist progress), the page passes a percent + tone and this
// renders a small ProgressRing meter beside the number — see
// ProgressRing.tsx for why that's a meter, not a two-color pie.

import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import type { BudgetTone } from "@/lib/budget-tone";

export function StatCard({
  label,
  value,
  subtext,
  ring,
}: {
  label: string;
  value: string;
  subtext?: string;
  ring?: { percent: number; tone?: BudgetTone };
}) {
  return (
    <Card className="flex items-center justify-between gap-3">
      {/* min-w-0 lets this block truncate/wrap instead of forcing the
          ring (below) to shrink to make room — without it, a flex child
          with no min-width defaults to its content's natural width, and
          a longer value/subtext on one card (e.g. "Budget spent") was
          squeezing its ring down to almost nothing while a shorter
          neighbor ("Checklist progress") rendered its ring at full size. */}
      <div className="min-w-0">
        <p className="text-sm text-akoma-ink/60">{label}</p>
        <p className="mt-1 truncate text-2xl font-semibold text-akoma-ink">{value}</p>
        {subtext && <p className="mt-1 text-xs text-akoma-ink/50">{subtext}</p>}
      </div>
      {/* shrink-0: the ring must always render at its intrinsic size,
          never compressed by flexbox to accommodate the text above. */}
      {ring && (
        <div className="shrink-0">
          <ProgressRing percent={ring.percent} tone={ring.tone} />
        </div>
      )}
    </Card>
  );
}
