// src/components/budget/BudgetAlertWatcher.tsx
//
// Fires a non-blocking toast (see ToastProvider.tsx) once the couple
// crosses 80% or 100% of budget — never blocks anything, just surfaces
// it. Mounted on both /budget and /dashboard, so whichever page is seen
// first after crossing a threshold is the one that shows it.
//
// Fires at most once per browser session per threshold, tracked in
// sessionStorage keyed by wedding plan + threshold — without this, the
// same toast would reappear on every single page navigation, which is
// the opposite of "friendly."

"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/ToastProvider";

export function BudgetAlertWatcher({ weddingPlanId, percentSpent }: { weddingPlanId: string; percentSpent: number }) {
  const showToast = useToast();

  useEffect(() => {
    const tier = percentSpent > 100 ? "over" : percentSpent >= 80 ? "approaching" : null;
    if (!tier) return;

    const key = `akoma-budget-alert-${weddingPlanId}-${tier}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    if (tier === "over") {
      showToast({
        tone: "danger",
        message: `You've gone over budget (${Math.round(percentSpent)}% spent). You can keep planning as normal — just worth a look.`,
        actionLabel: "Ask BisaAI for ways to cut costs",
        actionHref: "/bisaai",
      });
    } else {
      showToast({
        tone: "warning",
        message: `Heads up — you're at ${Math.round(percentSpent)}% of your budget. BisaAI can suggest ways to trim costs and stay on track.`,
        actionLabel: "Ask BisaAI",
        actionHref: "/bisaai",
      });
    }
  }, [weddingPlanId, percentSpent, showToast]);

  return null;
}
