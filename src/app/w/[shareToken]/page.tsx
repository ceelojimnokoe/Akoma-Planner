// src/app/w/[shareToken]/page.tsx
//
// Public, read-only wedding planning summary for a professional wedding
// planner — no auth, reachable by anyone with the link. Expanded from a
// purely celebratory 3-stat card into something a planner can actually
// coordinate from: venue, a simplified timeline, budget *allocations*
// (deliberately never spent/total/percent — see below), vendor booking
// status plus contact info for vendors the couple has actually accepted,
// checklist progress plus upcoming deadlines, and an RSVP breakdown.
//
// Still deliberately curated, not a mirror of the private dashboard.
// Never shown here: any User email/login info, Payment records,
// AIInteractionLog conversations, individual guest names or contacts,
// personal account settings. Budget is allocations only — no
// totalBudgetGHS, spentGHS, or percentSpent anywhere on this page, so a
// planner sees "what's budgeted for catering" without seeing the
// couple's overall financial position. This is a real shift from the
// old promise ("not budget or guest information") — it's exactly what
// was asked for, just worth being honest about in the footer text below
// rather than silently changing what a previously-shared link now shows.

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { daysUntil, formatDate } from "@/lib/dates";
import { calculateGuestStats } from "@/lib/guests";
import { formatGHS } from "@/lib/currency";
import { generateTimeline } from "@/lib/bisaai";
import { ONBOARDING_VENDOR_CATEGORIES } from "@/lib/validation/wedding";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const VENDOR_STATUS_LABEL: Record<string, string> = {
  BOOKED: "Booked",
  RESEARCHING: "Researching",
  NOT_STARTED: "Not started",
};

const VENDOR_STATUS_TONE: Record<string, "green" | "gold" | "neutral"> = {
  BOOKED: "green",
  RESEARCHING: "gold",
  NOT_STARTED: "neutral",
};

export default async function SharedWeddingPage({ params }: { params: Promise<{ shareToken: string }> }) {
  const { shareToken } = await params;
  const weddingPlan = await prisma.weddingPlan.findUnique({ where: { shareToken } });
  if (!weddingPlan) notFound();

  const [checklistItems, guests, coupleProfile, budgetCategories, vendorBookingStatuses, acceptedInterests, savedTimeline] =
    await Promise.all([
      prisma.checklistItem.findMany({ where: { weddingPlanId: weddingPlan.id } }),
      prisma.guest.findMany({ where: { weddingPlanId: weddingPlan.id } }),
      prisma.coupleProfile.findUnique({ where: { weddingPlanId: weddingPlan.id } }),
      prisma.budgetCategory.findMany({ where: { weddingPlanId: weddingPlan.id }, orderBy: { createdAt: "asc" } }),
      prisma.vendorBookingStatus.findMany({ where: { weddingPlanId: weddingPlan.id } }),
      prisma.vendorInterest.findMany({
        where: { weddingPlanId: weddingPlan.id, status: "ACCEPTED" },
        include: { vendor: true },
      }),
      prisma.timelineEntry.findMany({ where: { weddingPlanId: weddingPlan.id }, orderBy: { sortOrder: "asc" } }),
    ]);

  const doneCount = checklistItems.filter((i) => i.done).length;
  const checklistPercent = checklistItems.length ? Math.round((doneCount / checklistItems.length) * 100) : 0;
  const guestStats = calculateGuestStats(guests);
  const days = daysUntil(weddingPlan.weddingDate);

  const upcomingDeadlines = checklistItems
    .filter((i) => !i.done && i.dueDate)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 5);

  // No persisted timeline yet (the couple hasn't opened Design Tools) —
  // fall back to the same default template generateTimeline() always
  // starts from, for display only; nothing is written from this
  // unauthenticated page.
  const timeline =
    savedTimeline.length > 0
      ? savedTimeline
      : await generateTimeline({ weddingPlanId: weddingPlan.id, startTime: "09:00" }).then((r) => (r.ok ? r.data.entries : []));

  const bookedCount = vendorBookingStatuses.filter((s) => s.status === "BOOKED").length;

  return (
    <div className="mx-auto min-h-screen max-w-3xl space-y-6 bg-akoma-cream px-6 py-16">
      <div className="rounded-2xl border border-akoma-gold/30 bg-white p-8 text-center shadow-sm">
        <Badge tone="gold" className="mb-4">
          {weddingPlan.tradition} Wedding
        </Badge>
        <h1 className="text-3xl font-bold text-akoma-ink">{weddingPlan.coupleNames}</h1>
        <p className="mt-2 text-akoma-ink/60">
          {formatDate(weddingPlan.weddingDate)} · {cityLabel(weddingPlan.city)}
          {coupleProfile?.venueName && ` · ${coupleProfile.venueName}`}
        </p>

        <div className="mt-8 grid grid-cols-3 gap-4 border-t border-akoma-ink/10 pt-6">
          <Stat label="Countdown" value={days >= 0 ? `${days}d` : "🎉"} />
          <Stat label="Checklist progress" value={`${checklistPercent}%`} />
          <Stat label="Vendors booked" value={`${bookedCount}/${vendorBookingStatuses.length}`} />
        </div>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold text-akoma-ink">RSVPs</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <Stat label="Confirmed" value={String(guestStats.confirmedAttendees)} />
          <Stat label="Pending" value={String(guestStats.pendingAttendees)} />
          <Stat label="Declined" value={String(guestStats.declinedAttendees)} />
        </div>
      </Card>

      {upcomingDeadlines.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold text-akoma-ink">Upcoming deadlines</h2>
          <ul className="divide-y divide-akoma-ink/5">
            {upcomingDeadlines.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-akoma-ink/80">{task.title}</span>
                <span className="shrink-0 text-akoma-ink/50">{formatDate(task.dueDate!)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {budgetCategories.length > 0 && (
        <Card>
          <h2 className="mb-1 font-semibold text-akoma-ink">Budget allocations</h2>
          <p className="mb-3 text-xs text-akoma-ink/50">What&apos;s budgeted per category — not the couple&apos;s overall spending.</p>
          <ul className="divide-y divide-akoma-ink/5">
            {budgetCategories.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-akoma-ink/80">{c.name}</span>
                <span className="shrink-0 font-medium text-akoma-ink">{formatGHS(c.allocatedGHS)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {vendorBookingStatuses.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold text-akoma-ink">Vendor status</h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {vendorBookingStatuses.map((s) => {
              const label = ONBOARDING_VENDOR_CATEGORIES.find((c) => c.value === s.category)?.label ?? s.category;
              return (
                <li key={s.id} className="flex flex-col gap-1.5 rounded-lg border border-akoma-ink/10 px-2.5 py-1.5">
                  <span className="truncate text-xs text-akoma-ink/80">{label}</span>
                  <Badge tone={VENDOR_STATUS_TONE[s.status]} className="self-start">
                    {VENDOR_STATUS_LABEL[s.status]}
                  </Badge>
                </li>
              );
            })}
          </ul>

          {acceptedInterests.length > 0 && (
            <div className="mt-4 border-t border-akoma-ink/10 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-akoma-ink/40">Booked vendor contacts</p>
              <ul className="space-y-2">
                {acceptedInterests.map((interest) => (
                  <li key={interest.id} className="text-sm">
                    <span className="font-medium text-akoma-ink">{interest.vendor.name}</span>
                    {interest.vendor.contactPhone && <span className="text-akoma-ink/60"> · {interest.vendor.contactPhone}</span>}
                    {interest.vendor.contactEmail && <span className="text-akoma-ink/60"> · {interest.vendor.contactEmail}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {timeline.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold text-akoma-ink">Wedding day timeline</h2>
          <ol className="relative space-y-3 border-l border-akoma-ink/10 pl-4">
            {timeline.map((entry, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[1.32rem] top-1 h-2 w-2 rounded-full bg-akoma-green" />
                <p className="text-xs font-medium text-akoma-green">{entry.time}</p>
                <p className="text-sm text-akoma-ink">{entry.activity}</p>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <p className="text-center text-xs text-akoma-ink/40">
        Shared via AkomaPlanner — this page is a curated planning summary for coordinating the wedding. It never shows
        login details, payment history, individual guest names or contacts, or the couple&apos;s overall financial position.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xl font-semibold text-akoma-green">{value}</p>
      <p className="mt-0.5 text-xs text-akoma-ink/50">{label}</p>
    </div>
  );
}

function cityLabel(city: string) {
  return city.charAt(0) + city.slice(1).toLowerCase();
}
