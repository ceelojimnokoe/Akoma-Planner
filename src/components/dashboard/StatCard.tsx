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
//
// `valueTone` is a separate, smaller thing: some stats (Budget's
// "Remaining") want the number itself colored without a ring/percent at
// all. Deliberately its own prop rather than piggybacking on `ring.tone`
// (a `BudgetTone`, which has no neutral/grey member) — a stat can use
// either, both, or neither.
//
// `emphasis` is opt-in per-instance (like `valueTone`/`ring`), not a
// global style change — it exists so the dashboard's "Wedding countdown"
// tile can read more prominently now that it's the page's only
// countdown (see TopBarCountdown.tsx), without bumping every other
// StatCard across the app (Budget, Guest List, Checklist all render
// several of these in a row; changing the base size would throw off
// every one of those grids).

import clsx from "clsx";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import type { BudgetTone } from "@/lib/budget-tone";

export type ValueTone = "neutral" | "green" | "terracotta";

// Exported so anywhere else that colors text by this same three-tone
// scale (e.g. BudgetCategoryRow's per-row Remaining figure) reuses this
// map instead of a second, driftable copy.
export const VALUE_TONE_CLASSES: Record<ValueTone, string> = {
  neutral: "text-akoma-ink",
  green: "text-akoma-green",
  terracotta: "text-akoma-terracotta",
};

export function StatCard({
  label,
  value,
  subtext,
  ring,
  valueTone = "neutral",
  emphasis = false,
}: {
  label: string;
  value: string;
  subtext?: string;
  ring?: { percent: number; tone?: BudgetTone };
  valueTone?: ValueTone;
  emphasis?: boolean;
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
        <p className={clsx("text-sm text-akoma-ink/60", emphasis && "font-medium")}>{label}</p>
        <p
          className={clsx(
            "mt-1 truncate font-semibold",
            emphasis ? "text-3xl" : "text-2xl",
            VALUE_TONE_CLASSES[valueTone]
          )}
        >
          {value}
        </p>
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
