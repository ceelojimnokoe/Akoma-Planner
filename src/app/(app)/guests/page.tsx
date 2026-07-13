// src/app/(app)/guests/page.tsx
//
// The Guest List tool: RSVP tracking by side, capped at 100 guests on the
// Free plan (unlimited with the Wedding Pass — see lib/plan.ts
// canAddGuest, enforced in the addGuest server action).

import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { FREE_LIMITS, canAccessPassFeatures } from "@/lib/plan";
import { calculateGuestStats } from "@/lib/guests";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { GuestRow } from "@/components/guests/GuestRow";
import { AddGuestForm } from "@/components/guests/AddGuestForm";
import { RsvpPieChart } from "@/components/guests/RsvpPieChart";
import { ImportGuestsModal } from "@/components/guests/ImportGuestsModal";
import { GuestEstimateEditor } from "@/components/guests/GuestEstimateEditor";

export default async function GuestsPage() {
  const weddingPlan = await getCurrentWeddingPlan();
  const guests = await prisma.guest.findMany({
    where: { weddingPlanId: weddingPlan!.id },
    orderBy: [{ side: "asc" }, { name: "asc" }],
  });

  const stats = calculateGuestStats(guests);
  // The Free-plan cap is on guest *rows*, not attendee headcount — see
  // lib/guests.ts — so this stays on totalRecords even though every stat
  // card below is attendee-based.
  const capLabel = !canAccessPassFeatures(weddingPlan!)
    ? `${stats.totalRecords} of ${FREE_LIMITS.maxGuests} (Free plan)`
    : `${stats.totalRecords} (unlimited with the Wedding Pass)`;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-akoma-ink">Guest List</h1>
        <GuestEstimateEditor weddingPlanId={weddingPlan!.id} guestEstimate={weddingPlan!.guestEstimate} />
        <p className="mt-1 text-sm text-akoma-ink/60">{capLabel} added so far.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <StatCard
            label="Total guests"
            value={String(stats.totalAttendees)}
            subtext={`${stats.totalRecords} guest record${stats.totalRecords === 1 ? "" : "s"}, incl. +1s`}
          />
          <StatCard label="Confirmed" value={String(stats.confirmedAttendees)} />
          <StatCard label="Pending" value={String(stats.pendingAttendees)} />
          <StatCard label="Declined" value={String(stats.declinedAttendees)} />
        </div>
        <Card>
          <p className="mb-3 text-sm font-medium text-akoma-ink">RSVP breakdown</p>
          <RsvpPieChart confirmed={stats.confirmedAttendees} pending={stats.pendingAttendees} declined={stats.declinedAttendees} />
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-akoma-ink">Add a guest</p>
          <ImportGuestsModal weddingPlanId={weddingPlan!.id} />
        </div>
        <AddGuestForm weddingPlanId={weddingPlan!.id} />
      </Card>

      <Card>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-akoma-ink/10 text-xs uppercase tracking-wide text-akoma-ink/40">
              <th className="pb-2 font-medium">Guest</th>
              <th className="pb-2 font-medium">Side</th>
              <th className="pb-2 font-medium">RSVP</th>
              <th className="pb-2 font-medium">Group</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-akoma-ink/5">
            {guests.map((g) => (
              <GuestRow key={g.id} guest={g} />
            ))}
          </tbody>
        </table>

        {guests.length === 0 && (
          <p className="py-6 text-center text-sm text-akoma-ink/50">No guests yet — add one above.</p>
        )}
      </Card>
    </div>
  );
}
