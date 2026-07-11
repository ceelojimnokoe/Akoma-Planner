// src/app/(app)/dashboard/page.tsx
//
// The home screen once a wedding plan exists: budget snapshot, checklist
// progress, upcoming tasks, this week's high-priority focus, a
// recommended accommodation, vendor-booking status, and the countdown. A
// Server Component — it fetches everything it needs directly via Prisma
// and hands plain data to lib/budget.ts for the actual math, same as any
// other page would.

import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentWeddingPlan } from "@/lib/session";
import { calculateBudgetSummary } from "@/lib/budget";
import { formatGHS } from "@/lib/currency";
import { daysUntil, formatDate } from "@/lib/dates";
import { getAccommodationImage } from "@/lib/accommodation-images";
import { StatCard } from "@/components/dashboard/StatCard";
import { VendorStatusCard } from "@/components/dashboard/VendorStatusCard";
import { WeddingStyleCard } from "@/components/dashboard/WeddingStyleCard";
import { GuestProgressCard } from "@/components/dashboard/GuestProgressCard";
import { calculateGuestStats } from "@/lib/guests";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { getBudgetTone } from "@/lib/budget-tone";
import { BudgetAlertWatcher } from "@/components/budget/BudgetAlertWatcher";

export default async function DashboardPage() {
  // Layout already redirects to /onboarding if this is null, so this is
  // safe to treat as non-null here.
  const [user, weddingPlan] = await Promise.all([
    getCurrentUser(),
    getCurrentWeddingPlan(),
  ]);
  const [
    budgetCategories,
    checklistItems,
    guests,
    recommendedAccommodation,
    coupleProfile,
    vendorBookingStatuses,
  ] = await Promise.all([
    prisma.budgetCategory.findMany({
      where: { weddingPlanId: weddingPlan!.id },
    }),
    prisma.checklistItem.findMany({
      where: { weddingPlanId: weddingPlan!.id },
      orderBy: { dueDate: "asc" },
    }),
    prisma.guest.findMany({ where: { weddingPlanId: weddingPlan!.id } }),
    // "Recommended" = closest to the venue in the wedding's own city — the
    // simplest honest ranking we have real data for.
    prisma.accommodation.findFirst({
      where: { city: weddingPlan!.city },
      orderBy: { distanceFromVenueKm: "asc" },
    }),
    prisma.coupleProfile.findUnique({
      where: { weddingPlanId: weddingPlan!.id },
    }),
    prisma.vendorBookingStatus.findMany({
      where: { weddingPlanId: weddingPlan!.id },
    }),
  ]);

  const budget = calculateBudgetSummary(
    weddingPlan!.totalBudgetGHS,
    budgetCategories,
  );
  const doneCount = checklistItems.filter((i) => i.done).length;
  const checklistPercent = checklistItems.length
    ? Math.round((doneCount / checklistItems.length) * 100)
    : 0;
  const upcomingTasks = checklistItems.filter((i) => !i.done).slice(0, 5);
  // This week's focus: the checklist items that actually matter most right
  // now — not done, marked HIGH priority, soonest due date first.
  const focusTasks = checklistItems
    .filter((i) => !i.done && i.priority === "HIGH")
    .slice(0, 5);
  const guestStats = calculateGuestStats(guests);
  const days = daysUntil(weddingPlan!.weddingDate);

  // Additive, not a replacement for TopBar's coupleNames title — falls
  // back to a plain greeting once the couple has filled in display names.
  const greetingNames = [
    coupleProfile?.displayName1,
    coupleProfile?.displayName2,
  ]
    .filter(Boolean)
    .join(" & ");
  const hasStyleInfo =
    coupleProfile?.theme ||
    coupleProfile?.primaryColor ||
    coupleProfile?.dressCode;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Avatar
          pictureUrl={user.profilePictureUrl}
          name={user.name}
          size="lg"
        />
        <p className="text-sm text-akoma-ink/60">
          Welcome back{greetingNames ? `, ${greetingNames}` : ""} 👋
        </p>
      </div>

      <BudgetAlertWatcher
        weddingPlanId={weddingPlan!.id}
        percentSpent={budget.percentSpent}
      />

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
          ring={{
            percent: budget.percentSpent,
            tone: getBudgetTone(budget.percentSpent),
          }}
        />
        <StatCard
          label="Checklist progress"
          value={`${checklistPercent}%`}
          subtext={`${doneCount} of ${checklistItems.length} tasks done`}
          ring={{ percent: checklistPercent }}
        />
        <StatCard
          label="Guests confirmed"
          value={`${guestStats.confirmedAttendees}`}
          subtext={`of ${guestStats.totalAttendees} invited (est. ${weddingPlan!.guestEstimate})`}
        />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-akoma-ink">
              This week&apos;s focus
            </h2>
            <p className="text-xs text-akoma-ink/50">
              Your highest-priority tasks, soonest due date first.
            </p>
          </div>
          <Link
            href="/checklist"
            className="text-sm text-akoma-green hover:underline"
          >
            View checklist →
          </Link>
        </div>
        {focusTasks.length === 0 ? (
          <p className="text-sm text-akoma-ink/60">
            No outstanding high-priority tasks — nice work.
          </p>
        ) : (
          <ul className="divide-y divide-akoma-ink/10">
            {focusTasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-2">
                  <Badge tone="terracotta">High</Badge>
                  <span className="text-sm font-medium text-akoma-ink">
                    {task.title}
                  </span>
                </div>
                {task.dueDate && (
                  <Badge
                    tone={
                      daysUntil(task.dueDate) < 0 ? "terracotta" : "neutral"
                    }
                  >
                    {formatDate(task.dueDate)}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-akoma-ink">Upcoming tasks</h2>
            <Link
              href="/checklist"
              className="text-sm text-akoma-green hover:underline"
            >
              View checklist →
            </Link>
          </div>
          {upcomingTasks.length === 0 ? (
            <p className="text-sm text-akoma-ink/60">
              Nothing outstanding — nice work.
            </p>
          ) : (
            <ul className="divide-y divide-akoma-ink/10">
              {upcomingTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-akoma-ink">
                      {task.title}
                    </p>
                    <p className="text-xs text-akoma-ink/50">{task.category}</p>
                  </div>
                  {task.dueDate && (
                    <Badge
                      tone={
                        daysUntil(task.dueDate) < 0 ? "terracotta" : "neutral"
                      }
                    >
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
            <Link
              href="/budget"
              className="text-sm text-akoma-green hover:underline"
            >
              View budget →
            </Link>
          </div>
          <ul className="space-y-3">
            {budget.categories.slice(0, 6).map((c) => (
              <li key={c.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-akoma-ink/80">{c.name}</span>
                  <span
                    className={
                      c.isOverBudget
                        ? "text-akoma-terracotta"
                        : "text-akoma-ink/60"
                    }
                  >
                    {formatGHS(c.spentGHS)} / {formatGHS(c.allocatedGHS)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-akoma-ink/10">
                  <div
                    className={`h-full ${c.isOverBudget ? "bg-akoma-terracotta" : "bg-akoma-green"}`}
                    style={{
                      width: `${Math.min(100, (c.spentGHS / Math.max(c.allocatedGHS, 1)) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Vendor Status is the primary focus here (couples interact with it
          most), so it gets 2/3 of the row; Guest Confirmed and Wedding
          Style share the remaining 1/3, stacked. */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VendorStatusCard statuses={vendorBookingStatuses} />
        </div>
        <div className="flex flex-col gap-6">
          <GuestProgressCard
            confirmedAttendees={guestStats.confirmedAttendees}
            guestEstimate={weddingPlan!.guestEstimate}
          />
          {hasStyleInfo && (
            <WeddingStyleCard
              theme={coupleProfile?.theme ?? null}
              primaryColor={coupleProfile?.primaryColor ?? null}
              secondaryColor={coupleProfile?.secondaryColor ?? null}
              dressCode={coupleProfile?.dressCode ?? null}
            />
          )}
        </div>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-akoma-ink">
            Recommended accommodation
          </h2>
          <LinkButton href="/accommodation" variant="ghost" size="sm">
            See more options →
          </LinkButton>
        </div>
        {recommendedAccommodation ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-akoma-ink/10 p-3">
            <div className="flex items-center gap-3">
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-akoma-cream">
                <Image
                  src={getAccommodationImage(recommendedAccommodation)}
                  alt=""
                  fill
                  className="object-cover"
                />
              </span>
              <div>
                <p className="font-medium text-akoma-ink">
                  {recommendedAccommodation.name}
                </p>
                <p className="text-xs text-akoma-ink/50">
                  {recommendedAccommodation.distanceFromVenueKm.toFixed(1)} km
                  from the venue, for out-of-town family
                </p>
              </div>
            </div>
            <p className="text-sm font-medium text-akoma-ink">
              {formatGHS(recommendedAccommodation.priceLowGHS)}–
              {formatGHS(recommendedAccommodation.priceHighGHS)}{" "}
              <span className="font-normal text-akoma-ink/50">/ night</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-akoma-ink/60">
            No accommodation listings for your city yet.
          </p>
        )}
      </Card>

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
