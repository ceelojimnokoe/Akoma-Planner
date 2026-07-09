// src/components/bisaai/HoneymoonTool.tsx
"use client";

import { useState, useTransition } from "react";
import { runHoneymoonRecommendations } from "@/server/actions/bisaai";
import { ToolCard } from "@/components/bisaai/ToolCard";
import { Button } from "@/components/ui/Button";
import { EstimateBadge } from "@/components/ui/Badge";
import { formatGHS } from "@/lib/currency";

export function HoneymoonTool({ weddingPlanId }: { weddingPlanId: string }) {
  const [budget, setBudget] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof runHoneymoonRecommendations>> | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRun() {
    startTransition(async () => setResult(await runHoneymoonRecommendations(weddingPlanId, budget ? Number(budget) : undefined)));
  }

  return (
    <ToolCard title="Honeymoon ideas" description="Destination suggestions filtered to roughly your budget.">
      <div className="flex flex-wrap gap-2">
        <input
          type="number"
          min={0}
          placeholder="Budget (GHS, optional)"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="w-48 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        />
        <Button size="sm" variant="secondary" disabled={isPending} onClick={handleRun}>
          {isPending ? "Finding ideas…" : "Suggest destinations"}
        </Button>
      </div>
      {result?.ok && (
        <ul className="mt-3 space-y-2">
          {result.data.options.map((o) => (
            <li key={o.destination} className="flex items-center justify-between text-sm">
              <span className="text-akoma-ink/80">
                {o.destination}, {o.country}
              </span>
              <span className="flex items-center gap-2 text-akoma-ink/60">
                {formatGHS(o.estLowGHS)}–{formatGHS(o.estHighGHS)} <EstimateBadge />
              </span>
            </li>
          ))}
        </ul>
      )}
      {result && !result.ok && <p className="mt-2 text-sm text-akoma-terracotta">{result.error}</p>}
    </ToolCard>
  );
}
