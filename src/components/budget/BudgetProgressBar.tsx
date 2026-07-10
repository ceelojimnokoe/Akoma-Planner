// src/components/budget/BudgetProgressBar.tsx
//
// Animated bar showing total spent against total budget — the same
// "meter" idea as the dashboard's ProgressRing (one hue for the fill, a
// faint step of the same hue for the track, tone flips to terracotta
// once over budget), just horizontal so it can run the full width of
// the page. Needs to be a client component to animate: it renders at
// 0% on first paint, then grows to the real percent a tick later — a
// CSS `transition` only plays on a value that actually changes, not on
// whatever width is already there when the page loads.

"use client";

import { useEffect, useState } from "react";
import { formatGHS } from "@/lib/currency";

export function BudgetProgressBar({ spentGHS, totalGHS, percent }: { spentGHS: number; totalGHS: number; percent: number }) {
  const [width, setWidth] = useState(0);
  const overBudget = percent > 100;

  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(Math.min(100, percent)));
    return () => cancelAnimationFrame(id);
  }, [percent]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-akoma-ink/70">
          {formatGHS(spentGHS)} of {formatGHS(totalGHS)} spent
        </span>
        <span className={overBudget ? "font-medium text-akoma-terracotta" : "font-medium text-akoma-ink"}>
          {Math.round(percent)}%
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-akoma-ink/10">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            overBudget ? "bg-akoma-terracotta" : "bg-akoma-green"
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
      {overBudget && <p className="mt-1 text-xs text-akoma-terracotta">Over budget</p>}
    </div>
  );
}
