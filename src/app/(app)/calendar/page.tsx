// src/app/(app)/calendar/page.tsx
//
// Month view tying the wedding date, checklist due dates, and (Pass)
// vendor negotiation activity together. Free: wedding date + checklist.
// Pass: adds a layer of vendor events (drafted/sent/quoted/booked) on top
// — that's the "richer" half of "free basic / richer Pass" for this tool.
// Navigation is plain GET links (?year=&month=), same pattern as the
// vendor filters — no client JS needed for something this simple.

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { getMonthGrid, isSameDay } from "@/lib/dates";
import { canAccessPassFeatures } from "@/lib/plan";
import { Card } from "@/components/ui/Card";
import { Badge, PassBadge } from "@/components/ui/Badge";
import clsx from "clsx";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const VENDOR_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  QUOTED: "Quoted",
  ACCEPTED: "Booked",
  DECLINED: "Declined",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year: yearParam, month: monthParam } = await searchParams;
  const weddingPlan = await getCurrentWeddingPlan();

  const now = new Date();
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth(); // 0-indexed

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);

  const [checklistItems, vendorInterests] = await Promise.all([
    prisma.checklistItem.findMany({
      where: { weddingPlanId: weddingPlan!.id, dueDate: { gte: monthStart, lt: monthEnd } },
    }),
    canAccessPassFeatures(weddingPlan!)
      ? prisma.vendorInterest.findMany({
          where: { weddingPlanId: weddingPlan!.id, updatedAt: { gte: monthStart, lt: monthEnd } },
          include: { vendor: true },
        })
      : Promise.resolve([]),
  ]);

  const weeks = getMonthGrid(year, month);
  const monthLabel = monthStart.toLocaleDateString("en-GH", { year: "numeric", month: "long" });

  const prevMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-akoma-ink">Calendar</h1>
          <p className="mt-1 text-sm text-akoma-ink/60">Checklist due dates and your wedding day, at a glance.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/calendar?year=${prevMonth.year}&month=${prevMonth.month}`} className="text-sm text-akoma-green hover:underline">
            ← Prev
          </Link>
          <span className="text-sm font-medium text-akoma-ink">{monthLabel}</span>
          <Link href={`/calendar?year=${nextMonth.year}&month=${nextMonth.month}`} className="text-sm text-akoma-green hover:underline">
            Next →
          </Link>
        </div>
      </div>

      {!canAccessPassFeatures(weddingPlan!) && (
        <div className="flex items-center gap-2 rounded-lg bg-akoma-gold/5 px-4 py-2 text-sm text-akoma-ink/70">
          <PassBadge /> The Wedding Pass adds vendor enquiry/quote activity to this calendar too.
        </div>
      )}

      <Card>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-akoma-ink/10 text-xs">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="bg-akoma-ink/5 px-2 py-1.5 text-center font-medium text-akoma-ink/50">
              {label}
            </div>
          ))}
          {weeks.flat().map((day, i) => {
            const inMonth = day.getMonth() === month;
            const isWeddingDay = isSameDay(day, weddingPlan!.weddingDate);
            const dueTasks = checklistItems.filter((item) => item.dueDate && isSameDay(item.dueDate, day));
            const dayVendorEvents = vendorInterests.filter((v) => isSameDay(v.updatedAt, day));

            return (
              <div
                key={i}
                className={clsx(
                  "min-h-[6.5rem] bg-white p-1.5",
                  !inMonth && "bg-akoma-ink/[0.02] text-akoma-ink/30",
                  isWeddingDay && "ring-2 ring-inset ring-akoma-gold"
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className={clsx("text-xs", inMonth ? "text-akoma-ink/70" : "text-akoma-ink/30")}>{day.getDate()}</span>
                  {isWeddingDay && <span title="Wedding day">💍</span>}
                </div>
                <div className="space-y-0.5">
                  {dueTasks.slice(0, 2).map((task) => (
                    <p
                      key={task.id}
                      title={task.title}
                      className={clsx(
                        "truncate rounded px-1 py-0.5 text-[10px]",
                        task.done ? "bg-akoma-green/10 text-akoma-green" : "bg-akoma-terracotta/10 text-akoma-terracotta"
                      )}
                    >
                      {task.title}
                    </p>
                  ))}
                  {dueTasks.length > 2 && <p className="text-[10px] text-akoma-ink/40">+{dueTasks.length - 2} more</p>}
                  {dayVendorEvents.slice(0, 2).map((v) => (
                    <p key={v.id} title={`${v.vendor.name}: ${VENDOR_STATUS_LABEL[v.status]}`} className="truncate rounded bg-akoma-gold/10 px-1 py-0.5 text-[10px] text-akoma-gold">
                      {v.vendor.name}: {VENDOR_STATUS_LABEL[v.status]}
                    </p>
                  ))}
                  {dayVendorEvents.length > 2 && <p className="text-[10px] text-akoma-ink/40">+{dayVendorEvents.length - 2} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-wrap gap-3 text-xs text-akoma-ink/50">
        <Badge tone="terracotta">Task due</Badge>
        <Badge tone="green">Task done</Badge>
        {canAccessPassFeatures(weddingPlan!) && <Badge tone="gold">Vendor activity</Badge>}
        <span>💍 Wedding day</span>
      </div>
    </div>
  );
}
