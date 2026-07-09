// src/lib/budget-defaults.ts
//
// Starter budget category split offered when a new wedding plan is
// created, so the Budget tool isn't empty on day one. Percentages are a
// typical/common allocation pattern for Ghanaian weddings (also referenced
// in BisaAI's basicQA knowledge base — see lib/bisaai.ts) — a starting
// point the couple is expected to adjust, not a rule.

export interface BudgetSplitEntry {
  name: string;
  percentOfBudget: number;
}

export const DEFAULT_BUDGET_SPLIT: BudgetSplitEntry[] = [
  { name: "Venue", percentOfBudget: 25 },
  { name: "Catering", percentOfBudget: 20 },
  { name: "Attire", percentOfBudget: 15 },
  { name: "Traditional Rites", percentOfBudget: 12 },
  { name: "Photography & Media", percentOfBudget: 10 },
  { name: "Decor", percentOfBudget: 8 },
  { name: "Music & Entertainment", percentOfBudget: 5 },
  { name: "Transport", percentOfBudget: 3 },
  { name: "Cake", percentOfBudget: 2 },
];

export interface BuiltBudgetCategory {
  name: string;
  allocatedGHS: number;
  spentGHS: 0;
}

export function buildDefaultBudgetCategories(totalBudgetGHS: number): BuiltBudgetCategory[] {
  return DEFAULT_BUDGET_SPLIT.map((entry) => ({
    name: entry.name,
    allocatedGHS: Math.round(totalBudgetGHS * (entry.percentOfBudget / 100)),
    spentGHS: 0,
  }));
}
