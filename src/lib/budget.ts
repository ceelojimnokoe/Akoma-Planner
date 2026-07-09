// src/lib/budget.ts
//
// Pure budget-calculator logic — no Prisma import, no Next.js import. It
// takes plain data in and returns plain data out, which is what makes it
// trivially unit-testable (see tests/budget.test.ts) without a database or
// a running server. The dashboard and budget pages call this with data
// they already fetched via Prisma; this file never fetches anything itself.

export interface BudgetCategoryInput {
  id: string;
  name: string;
  allocatedGHS: number;
  spentGHS: number;
}

export interface BudgetCategorySummary extends BudgetCategoryInput {
  /** What % of the *total wedding budget* this category's allocation represents. */
  percentOfTotalBudget: number;
  /** What's left to spend within this category's own allocation (can go negative if overspent). */
  remainingInCategory: number;
  /** True once spentGHS exceeds allocatedGHS for this category. */
  isOverBudget: boolean;
}

export interface BudgetSummary {
  totalBudgetGHS: number;
  totalAllocatedGHS: number;
  totalSpentGHS: number;
  /** Budget not yet assigned to any category. */
  unallocatedGHS: number;
  /** Total budget minus total spent, across all categories. */
  remainingGHS: number;
  /** 0–100+, how much of the whole wedding budget has been spent. */
  percentSpent: number;
  categories: BudgetCategorySummary[];
}

/**
 * Aggregates a wedding's budget categories against its total budget.
 * Guards against divide-by-zero (a wedding with a totalBudgetGHS of 0)
 * by returning 0% rather than NaN/Infinity — the UI should never have to
 * defend against that itself.
 */
export function calculateBudgetSummary(
  totalBudgetGHS: number,
  categories: BudgetCategoryInput[]
): BudgetSummary {
  const totalAllocatedGHS = sum(categories.map((c) => c.allocatedGHS));
  const totalSpentGHS = sum(categories.map((c) => c.spentGHS));

  const categorySummaries: BudgetCategorySummary[] = categories.map((c) => ({
    ...c,
    percentOfTotalBudget: percent(c.allocatedGHS, totalBudgetGHS),
    remainingInCategory: c.allocatedGHS - c.spentGHS,
    isOverBudget: c.spentGHS > c.allocatedGHS,
  }));

  return {
    totalBudgetGHS,
    totalAllocatedGHS,
    totalSpentGHS,
    unallocatedGHS: totalBudgetGHS - totalAllocatedGHS,
    remainingGHS: totalBudgetGHS - totalSpentGHS,
    percentSpent: percent(totalSpentGHS, totalBudgetGHS),
    categories: categorySummaries,
  };
}

function sum(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}

function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return (part / whole) * 100;
}
