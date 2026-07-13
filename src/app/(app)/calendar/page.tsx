// src/app/(app)/calendar/page.tsx
//
// Three views (month/week/agenda) tying the wedding date, checklist due
// dates, and (Pass) vendor negotiation activity together. Free: wedding
// date + checklist. Pass: adds a layer of vendor events (drafted/sent/
// quoted/booked) on top — that's the "richer" half of "free basic /
// richer Pass" for this tool. Still a Server Component for all its data
// fetching; the interactive parts (task-detail popup, view rendering)
// live in CalendarView.tsx, a client component this page hands
// pre-fetched data to.
//
// Navigation stays plain GET links for month/agenda (?year=&month=), same
// pattern as the vendor filters. Week view is intentionally decoupled
// from year/month — it has its own ?weekStart= date param, defaulting to
// the week containing today, with its own prev/next-week links, rather
// than trying to compute "the corresponding week" when switching from
// month view.

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { getMonthGrid, getWeekDays, toDateInputValue } from "@/lib/dates";
import { canAccessPassFeatures } from "@/lib/plan";
import { Card } from "@/components/ui/Card";
import { Badge, PassBadge } from "@/components/ui/Badge";
import { CalendarView, type CalendarViewMode, type CalendarVendorEvent } from "@/components/calendar/CalendarView";
import { UpcomingTasksPanel } from "@/components/calendar/UpcomingTasksPanel";
import clsx from "clsx";

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; view?: string; weekStart?: string }>;
}) {
  const { year: yearParam, month: monthParam, view: viewParam, weekStart: weekStartParam } = await searchParams;
  const weddingPlan = await getCurrentWeddingPlan();

  const view: CalendarViewMode = viewParam === "week" || viewParam === "agenda" ? viewParam : "month";
  const now = new Date();

  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth(); // 0-indexed
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);
  const weeks = getMonthGrid(year, month);

  const weekStartDate = weekStartParam ? new Date(weekStartParam) : getWeekDays(now)[0];
  const weekDays = getWeekDays(weekStartDate);

  // Padded to cover the full grid (including adjacent-month leading/
  // trailing days) so a task due on one of those padding days actually
  // shows instead of silently vanishing — the old query used the exact
  // month boundary and missed them.
  const gridRangeStart = weeks[0][0];
  const lastCell = weeks[weeks.length - 1][6];
  const gridRangeEnd = addDays(lastCell, 1);
  const weekRangeStart = weekDays[0];
  const weekRangeEnd = addDays(weekDays[6], 1);

  const rangeStart = view === "week" ? weekRangeStart : gridRangeStart;
  const rangeEnd = view === "week" ? weekRangeEnd : gridRangeEnd;

  const [rangeChecklistItems, vendorInterests, monthUpcomingTasks] = await Promise.all([
    prisma.checklistItem.findMany({
      where: { weddingPlanId: weddingPlan!.id, dueDate: { gte: rangeStart, lt: rangeEnd } },
    }),
    canAccessPassFeatures(weddingPlan!)
      ? prisma.vendorInterest.findMany({
          where: { weddingPlanId: weddingPlan!.id, updatedAt: { gte: rangeStart, lt: rangeEnd } },
          include: { vendor: true },
        })
      : Promise.resolve([]),
    prisma.checklistItem.findMany({
      where: { weddingPlanId: weddingPlan!.id, done: false, dueDate: { gte: monthStart, lt: monthEnd } },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const vendorEvents: CalendarVendorEvent[] = vendorInterests.map((v) => ({
    id: v.id,
    vendorName: v.vendor.name,
    status: v.status,
    updatedAt: v.updatedAt,
  }));

  const monthLabel = monthStart.toLocaleDateString("en-GH", { year: "numeric", month: "long" });
  const weekLabel = `${weekDays[0].toLocaleDateString("en-GH", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-GH", { month: "short", day: "numeric", year: "numeric" })}`;

  const prevMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
  const prevWeekStart = toDateInputValue(addDays(weekStartDate, -7));
  const nextWeekStart = toDateInputValue(addDays(weekStartDate, 7));

  const viewLink = (v: CalendarViewMode) => `/calendar?view=${v}&year=${year}&month=${month}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-akoma-ink">Calendar</h1>
          <p className="mt-1 text-sm text-akoma-ink/60">Checklist due dates and your wedding day, at a glance.</p>
        </div>

        <div className="flex gap-1 rounded-lg border border-akoma-ink/10 bg-white p-1">
          {(["month", "week", "agenda"] as const).map((v) => (
            <Link
              key={v}
              href={viewLink(v)}
              className={clsx(
                "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                view === v ? "bg-akoma-green text-white" : "text-akoma-ink/60 hover:bg-akoma-ink/5"
              )}
            >
              {v}
            </Link>
          ))}
        </div>

        {view === "week" ? (
          <div className="flex items-center gap-3">
            <Link href={`/calendar?view=week&weekStart=${prevWeekStart}`} className="text-sm text-akoma-green hover:underline">
              ← Prev
            </Link>
            <span className="text-sm font-medium text-akoma-ink">{weekLabel}</span>
            <Link href={`/calendar?view=week&weekStart=${nextWeekStart}`} className="text-sm text-akoma-green hover:underline">
              Next →
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href={`/calendar?view=${view}&year=${prevMonth.year}&month=${prevMonth.month}`} className="text-sm text-akoma-green hover:underline">
              ← Prev
            </Link>
            <span className="text-sm font-medium text-akoma-ink">{monthLabel}</span>
            <Link href={`/calendar?view=${view}&year=${nextMonth.year}&month=${nextMonth.month}`} className="text-sm text-akoma-green hover:underline">
              Next →
            </Link>
          </div>
        )}
      </div>

      {!canAccessPassFeatures(weddingPlan!) && (
        <div className="flex items-center gap-2 rounded-lg bg-akoma-gold/5 px-4 py-2 text-sm text-akoma-ink/70">
          <PassBadge /> The Wedding Pass adds vendor enquiry/quote activity to this calendar too.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CalendarView
              view={view}
              weeks={weeks}
              weekDays={weekDays}
              referenceMonth={month}
              tasks={rangeChecklistItems}
              vendorEvents={vendorEvents}
              weddingDate={weddingPlan!.weddingDate}
              today={now}
            />
          </Card>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-akoma-ink/50">
            <Badge tone="terracotta">Task due</Badge>
            <Badge tone="green">Task done</Badge>
            {canAccessPassFeatures(weddingPlan!) && <Badge tone="gold">Vendor activity</Badge>}
            <span>💍 Wedding day</span>
          </div>
        </div>

        <UpcomingTasksPanel tasks={monthUpcomingTasks} />
      </div>
    </div>
  );
}
