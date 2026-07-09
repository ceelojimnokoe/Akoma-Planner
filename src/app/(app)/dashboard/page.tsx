// src/app/(app)/dashboard/page.tsx
//
// The home screen once a wedding plan exists: budget snapshot, checklist
// progress, upcoming tasks, and the countdown. A Server Component — it
// fetches everything it needs directly via Prisma and hands plain data to
// lib/budget.ts for the actual math, same as any other page would.

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { calculateBudgetSummary } from "@/lib/budget";
import { formatGHS } from "@/lib/currency";
import { daysUntil, formatDate } from "@/lib/dates";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function DashboardPage() {
  // Layout already redirects to /onboarding if this is null, so this is
  // safe to treat as non-null here.
  const weddingPlan = await getCurrentWeddingPlan();
  const [budgetCategories, checklistItems, guests] = await Promise.all([
    prisma.budgetCategory.findMany({ where: { weddingPlanId: weddingPlan!.id } }),
    prisma.checklistItem.findMany({ where: { weddingPlanId: weddingPlan!.id }, orderBy: { dueDate: "asc" } }),
    prisma.guest.findMany({ where: { weddingPlanId: weddingPlan!.id } }),
  ]);

  const budget = calculateBudgetSummary(weddingPlan!.totalBudgetGHS, budgetCategories);
  const doneCount = checklistItems.filter((i) => i.done).length;
  const checklistPercent = checklistItems.length ? Math.round((doneCount / checklistItems.length) * 100) : 0;
  const upcomingTasks = checklistItems.filter((i) => !i.done).slice(0, 5);
  const confirmedGuests = guests.filter((g) => g.rsvpStatus === "YES").length;
  const days = daysUntil(weddingPlan!.weddingDate);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Wedding countdown"
          value={days >= 0 ? `${days} days` : "Past"}
          subtext={formatDate(weddingPlan!.weddingDate)}
        />
        <StatCard
          label="Budget spent"
          value={formatGHS(budget.totalSpentGHS)}
          subtext={`of ${formatGHS(budget.totalBudgetGHS)} (${Math.round(budget.percentSpent)}%)`}
        />
        <StatCard
          label="Checklist progress"
          value={`${checklistPercent}%`}
          subtext={`${doneCount} of ${checklistItems.length} tasks done`}
        />
        <StatCard
          label="Guests confirmed"
          value={`${confirmedGuests}`}
          subtext={`of ${guests.length} invited (est. ${weddingPlan!.guestEstimate})`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-akoma-ink">Upcoming tasks</h2>
            <Link href="/checklist" className="text-sm text-akoma-green hover:underline">
              View checklist →
            </Link>
          </div>
          {upcomingTasks.length === 0 ? (
            <p className="text-sm text-akoma-ink/60">Nothing outstanding — nice work.</p>
          ) : (
            <ul className="divide-y divide-akoma-ink/10">
              {upcomingTasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-akoma-ink">{task.title}</p>
                    <p className="text-xs text-akoma-ink/50">{task.category}</p>
                  </div>
                  {task.dueDate && (
                    <Badge tone={daysUntil(task.dueDate) < 0 ? "terracotta" : "neutral"}>
                      {formatDate(task.dueDate)}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-akoma-ink">Budget by category</h2>
            <Link href="/budget" className="text-sm text-akoma-green hover:underline">
              View budget →
            </Link>
          </div>
          <ul className="space-y-3">
            {budget.categories.slice(0, 6).map((c) => (
              <li key={c.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-akoma-ink/80">{c.name}</span>
                  <span className={c.isOverBudget ? "text-akoma-terracotta" : "text-akoma-ink/60"}>
                    {formatGHS(c.spentGHS)} / {formatGHS(c.allocatedGHS)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-akoma-ink/10">
                  <div
                    className={`h-full ${c.isOverBudget ? "bg-akoma-terracotta" : "bg-akoma-green"}`}
                    style={{ width: `${Math.min(100, (c.spentGHS / Math.max(c.allocatedGHS, 1)) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <QuickLink href="/vendors" label="Browse vendors" />
        <QuickLink href="/bisaai" label="Ask BisaAI" />
        <QuickLink href="/guests" label="Manage guests" />
        <QuickLink href="/calendar" label="Open calendar" />
      </div>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-akoma-ink/10 bg-white px-4 py-3 text-center text-sm font-medium text-akoma-ink transition-colors hover:border-akoma-green hover:text-akoma-green"
    >
      {label}
    </Link>
  );
}
