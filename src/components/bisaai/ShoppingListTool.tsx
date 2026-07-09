// src/components/bisaai/ShoppingListTool.tsx
"use client";

import { useState, useTransition } from "react";
import { runShoppingList } from "@/server/actions/bisaai";
import { ToolCard } from "@/components/bisaai/ToolCard";
import { Button } from "@/components/ui/Button";
import { EstimateBadge } from "@/components/ui/Badge";
import { formatGHS } from "@/lib/currency";

export function ShoppingListTool({ weddingPlanId }: { weddingPlanId: string }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof runShoppingList>> | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRun() {
    startTransition(async () => setResult(await runShoppingList(weddingPlanId)));
  }

  return (
    <ToolCard title="Shopping list" description="Estimated extras: stationery, favors, bridal party gifts.">
      <Button size="sm" variant="secondary" disabled={isPending} onClick={handleRun}>
        {isPending ? "Generating…" : "Generate shopping list"}
      </Button>
      {result?.ok && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-akoma-ink">
              Total: {formatGHS(result.data.totalEstimateLowGHS)} – {formatGHS(result.data.totalEstimateHighGHS)}
            </p>
            <EstimateBadge />
          </div>
          <ul className="divide-y divide-akoma-ink/5 text-sm">
            {result.data.items.map((item) => (
              <li key={item.itemName} className="flex justify-between py-1.5">
                <span className="text-akoma-ink/80">
                  {item.itemName} <span className="text-xs text-akoma-ink/40">· {item.category}</span>
                </span>
                <span className="text-akoma-ink/60">
                  {formatGHS(item.estLowGHS)}–{formatGHS(item.estHighGHS)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {result && !result.ok && <p className="mt-2 text-sm text-akoma-terracotta">{result.error}</p>}
    </ToolCard>
  );
}
