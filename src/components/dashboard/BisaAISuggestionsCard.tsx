// src/components/dashboard/BisaAISuggestionsCard.tsx
//
// The "doesn't wait to be asked" surface for BisaAI's proactive
// suggestions (see lib/bisaai.ts's getProactiveSuggestions and
// lib/bisaai-qa.ts's rule set) — visible on the dashboard without
// opening chat at all. Purely presentational: dashboard/page.tsx fetches
// the suggestions (same pattern as every other card here, which all
// receive pre-fetched data as props rather than fetching themselves).

import type { ProactiveSuggestion } from "@/lib/bisaai-qa";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

const SEVERITY_ICON: Record<ProactiveSuggestion["severity"], string> = {
  warning: "⚠️",
  info: "💡",
  positive: "🎉",
};

export function BisaAISuggestionsCard({ suggestions }: { suggestions: ProactiveSuggestion[] }) {
  if (suggestions.length === 0) return null;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-akoma-ink">BisaAI suggestions</h2>
        <LinkButton href="/bisaai" variant="ghost" size="sm">
          Ask BisaAI →
        </LinkButton>
      </div>
      <ul className="space-y-3">
        {suggestions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-akoma-ink/10 p-3">
            <p className="flex items-start gap-2 text-sm text-akoma-ink/80">
              <span aria-hidden>{SEVERITY_ICON[s.severity]}</span>
              <span>{s.message}</span>
            </p>
            {s.actionHref && s.actionLabel && (
              <LinkButton href={s.actionHref} variant="ghost" size="sm" className="shrink-0">
                {s.actionLabel}
              </LinkButton>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
