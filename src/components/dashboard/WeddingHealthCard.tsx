// src/components/dashboard/WeddingHealthCard.tsx
//
// The dashboard's single-glance "how's planning actually going" widget —
// a big score, a status pill, and the four signals that feed it (see
// lib/wedding-health.ts for the scoring itself). Purely presentational,
// same pattern as every other dashboard card: the page computes the
// result and hands it down as a prop. The score itself sits inside a
// Tooltip (hover on desktop, tap on mobile) explaining *why* — positive
// reinforcement first, specific next priorities second — via
// getHealthScoreSummary, the one other bit of derived data this card
// needs beyond `health`.

import { getHealthScoreSummary, type WeddingHealthResult } from "@/lib/wedding-health";
import { Card } from "@/components/ui/Card";
import { Tooltip } from "@/components/ui/Tooltip";

const STATUS_TONE: Record<WeddingHealthResult["status"], string> = {
  "on-track": "text-akoma-green",
  "needs-attention": "text-akoma-gold",
  "at-risk": "text-akoma-terracotta",
};

export function WeddingHealthCard({
  health,
  unbookedCategoryLabels,
}: {
  health: WeddingHealthResult;
  unbookedCategoryLabels: string[];
}) {
  const summary = getHealthScoreSummary(health, { unbookedCategoryLabels });

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tooltip
          content={
            <div>
              <p className="font-semibold text-akoma-ink">
                {health.statusLabel} ({health.score}%)
              </p>
              {summary.completed.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-akoma-ink/40">Completed</p>
                  <ul className="mt-1 space-y-1">
                    {summary.completed.map((line) => (
                      <li key={line} className="text-akoma-green">
                        ✔ <span className="text-akoma-ink/80">{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.improve.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-akoma-ink/40">Still to improve</p>
                  <ul className="mt-1 space-y-1 text-akoma-ink/80">
                    {summary.improve.map((line) => (
                      <li key={line}>• {line}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          }
        >
          <div>
            <p className="text-sm text-akoma-ink/60">Wedding health score</p>
            <div className="mt-1 flex items-baseline gap-3">
              <p className="text-4xl font-bold text-akoma-ink">{health.score}%</p>
              <p className={`text-sm font-medium ${STATUS_TONE[health.status]}`}>{health.statusLabel}</p>
            </div>
          </div>
        </Tooltip>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
          <HealthStat label="Budget" value={health.budget.label} />
          <HealthStat label="Vendors" value={health.vendors.label} />
          <HealthStat label="Guests" value={health.guests.label} />
          <HealthStat label="Timeline" value={health.timeline.label} />
        </dl>
      </div>
    </Card>
  );
}

function HealthStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-akoma-ink/50">{label}</dt>
      <dd className="text-sm font-medium text-akoma-ink">{value}</dd>
    </div>
  );
}
