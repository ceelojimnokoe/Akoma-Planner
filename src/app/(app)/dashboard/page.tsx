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
import { getProactiveSuggestions } from "@/lib/bisaai";
import { StatCard } from "@/components/dashboard/StatCard";
import { VendorStatusCard } from "@/components/dashboard/VendorStatusCard";
import { WeddingStyleCard } from "@/components/dashboard/WeddingStyleCard";
import { GuestProgressCard } from "@/components/dashboard/GuestProgressCard";
import { PendingGuestsCard } from "@/components/dashboard/PendingGuestsCard";
import { WeddingHealthCard } from "@/components/dashboard/WeddingHealthCard";
import { BisaAISuggestionsCard } from "@/components/dashboard/BisaAISuggestionsCard";
import { calculateGuestStats, selectPendingGuestFollowUps } from "@/lib/guests";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { getBudgetTone } from "@/lib/budget-tone";
import { getChecklistTone } from "@/lib/checklist-tone";
import { sortByFocusPriority } from "@/lib/checklist-sort";
import { getWeddingHealthScore } from "@/lib/wedding-health";
import { ONBOARDING_VENDOR_CATEGORIES } from "@/lib/validation/wedding";
import { CRITICAL_VENDOR_CATEGORIES } from "@/lib/bisaai-qa";
import { PRIORITY_TONE } from "@/components/checklist/ChecklistItemRow";
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
    vendorInterests,
    suggestionsResult,
  ] = await Promise.all([
    prisma.budgetCategory.findMany({
      where: { weddingPlanId: weddingPlan!.id },
      // Matches budget/page.tsx's own existing convention — without
      // this, the "Budget by category" card's slice(0, 6) below fell
      // back to DB insertion order, which had no relationship to size
      // or importance and only got less predictable as the default
      // split grew past 6 entries.
      orderBy: { createdAt: "asc" },
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
    prisma.vendorInterest.findMany({
      where: { weddingPlanId: weddingPlan!.id },
      include: { vendor: { select: { name: true } } },
    }),
    // Its own internal fetch duplicates a few of the queries above (see
    // lib/bisaai-context.ts's header comment on why that's deliberate) —
    // still one Promise.all slot, run in parallel with everything else.
    getProactiveSuggestions(weddingPlan!.id),
  ]);
  const suggestions = suggestionsResult.ok ? suggestionsResult.data.suggestions : [];

  const budget = calculateBudgetSummary(
    weddingPlan!.totalBudgetGHS,
    budgetCategories,
  );
  const doneCount = checklistItems.filter((i) => i.done).length;
  const checklistPercent = checklistItems.length
    ? Math.round((doneCount / checklistItems.length) * 100)
    : 0;
  // This week's focus: nearest due date first regardless of priority, so
  // the couple sees what actually needs attention next — priority only
  // breaks a tie on the same due date. See lib/checklist-sort.ts.
  const focusTasks = sortByFocusPriority(checklistItems).slice(0, 5);
  const guestStats = calculateGuestStats(guests);
  // Pending guest confirmations: longest-waiting first — see lib/guests.ts.
  const pendingGuests = selectPendingGuestFollowUps(guests, 5);
  const days = daysUntil(weddingPlan!.weddingDate);

  const vendorsBookedCount = vendorBookingStatuses.filter((s) => s.status === "BOOKED").length;

  // Priority-ordered (critical categories first) list of unbooked
  // category labels, for the Wedding Health Score tooltip's "Still to
  // improve" bullets — see lib/wedding-health.ts's getHealthScoreSummary.
  const bookedCategories = new Set<string>(vendorBookingStatuses.filter((s) => s.status === "BOOKED").map((s) => s.category));
  const criticalCategorySet = new Set<string>(CRITICAL_VENDOR_CATEGORIES);
  const unbookedCategoryLabels = [
    ...ONBOARDING_VENDOR_CATEGORIES.filter((c) => criticalCategorySet.has(c.value) && !bookedCategories.has(c.value)),
    ...ONBOARDING_VENDOR_CATEGORIES.filter((c) => !criticalCategorySet.has(c.value) && !bookedCategories.has(c.value)),
  ].map((c) => c.label);

  const health = getWeddingHealthScore({
    checklistPercent,
    weddingPlanCreatedAt: weddingPlan!.createdAt,
    weddingDate: weddingPlan!.weddingDate,
    budgetPercentSpent: budget.percentSpent,
    budgetRemainingGHS: budget.remainingGHS,
    vendorsBookedCount,
    vendorsTotalCount: ONBOARDING_VENDOR_CATEGORIES.length,
    guestsConfirmedAttendees: guestStats.confirmedAttendees,
    guestsTotalAttendees: guestStats.totalAttendees,
  });

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

      <div data-tour="dashboard-overview" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Wedding countdown"
          value={days >= 0 ? `${days} days` : "Past"}
          subtext={formatDate(weddingPlan!.weddingDate)}
          emphasis
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
          ring={{ percent: checklistPercent, tone: getChecklistTone(checklistPercent) }}
        />
        <StatCard
          label="Guests confirmed"
          value={`${guestStats.confirmedAttendees}`}
          subtext={`of ${guestStats.totalAttendees} invited (est. ${weddingPlan!.guestEstimate})`}
        />
      </div>

      <WeddingHealthCard health={health} unbookedCategoryLabels={unbookedCategoryLabels} />

      <BisaAISuggestionsCard suggestions={suggestions} />

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-akoma-ink">
              This week&apos;s focus
            </h2>
            <p className="text-xs text-akoma-ink/50">
              Your soonest deadlines, regardless of priority.
            </p>
          </div>
          <LinkButton href="/checklist" variant="ghost" size="sm">
            View checklist →
          </LinkButton>
        </div>
        {focusTasks.length === 0 ? (
          <p className="text-sm text-akoma-ink/60">
            Nothing outstanding — nice work.
          </p>
        ) : (
          <ul className="divide-y divide-akoma-ink/10">
            {focusTasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-2">
                  <Badge tone={PRIORITY_TONE[task.priority]}>
                    {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                  </Badge>
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
        <PendingGuestsCard pendingCount={guestStats.pendingRecords} pendingGuests={pendingGuests} />

        {/* sm:pr-20: this card sits at the bottom-right of a mid-page row —
            well before the true bottom of the dashboard — so the floating
            chat bubble (fixed to the viewport corner, not to page content)
            can otherwise land on top of its last row's amounts at typical
            scroll positions. Scoped to just this card rather than the
            whole page, since the dashboard's *other* rows (the top stat
            grid especially) don't have room to spare — see (app)/layout.tsx. */}
        <Card className="sm:pr-20">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-akoma-ink">Budget by category</h2>
            <LinkButton href="/budget" variant="ghost" size="sm">
              View budget →
            </LinkButton>
          </div>
          <ul className="space-y-3">
            {budget.categories.slice(0, 6).map((c) => {
              const isUnset = c.allocatedGHS === 0 && c.spentGHS === 0;
              return (
                <li key={c.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-akoma-ink/80">{c.name}</span>
                    {isUnset ? (
                      <span className="text-akoma-ink/40">—</span>
                    ) : (
                      <span
                        className={
                          c.isOverBudget
                            ? "text-akoma-terracotta"
                            : "text-akoma-ink/60"
                        }
                      >
                        {formatGHS(c.spentGHS)} / {formatGHS(c.allocatedGHS)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-akoma-ink/10">
                    <div
                      className={`h-full ${c.isOverBudget ? "bg-akoma-terracotta" : "bg-akoma-green"}`}
                      style={{
                        width: isUnset ? "0%" : `${Math.min(100, (c.spentGHS / Math.max(c.allocatedGHS, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {/* Vendor Status is the primary focus here (couples interact with it
          most), so it gets 2/3 of the row; Guest Confirmed and Wedding
          Style share the remaining 1/3, stacked. */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VendorStatusCard
            interests={vendorInterests.map((i) => ({
              vendorId: i.vendorId,
              vendorName: i.vendor.name,
              onboardingCategory: i.onboardingCategory,
              bookingProgress: i.bookingProgress,
              updatedAt: i.updatedAt,
            }))}
          />
        </div>
        {/* Same sm:pr-20 reasoning as "Budget by category" above — this
            column's cards sit at the row's right edge, in the bubble's path. */}
        <div className="flex flex-col gap-6 sm:pr-20">
          <GuestProgressCard
            confirmedAttendees={guestStats.confirmedAttendees}
            pendingAttendees={guestStats.pendingAttendees}
            declinedAttendees={guestStats.declinedAttendees}
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
