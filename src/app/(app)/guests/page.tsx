// src/app/(app)/guests/page.tsx
//
// The Guest List tool: RSVP tracking by side, capped at 100 guests on the
// Free plan (unlimited on Pro — see lib/plan.ts canAddGuest, enforced in
// the addGuest server action).

import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { FREE_LIMITS } from "@/lib/plan";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { GuestRow } from "@/components/guests/GuestRow";
import { AddGuestForm } from "@/components/guests/AddGuestForm";
import { RsvpPieChart } from "@/components/guests/RsvpPieChart";

export default async function GuestsPage() {
  const weddingPlan = await getCurrentWeddingPlan();
  const guests = await prisma.guest.findMany({
    where: { weddingPlanId: weddingPlan!.id },
    orderBy: [{ side: "asc" }, { name: "asc" }],
  });

  const confirmed = guests.filter((g) => g.rsvpStatus === "YES").length;
  const pending = guests.filter((g) => g.rsvpStatus === "PENDING").length;
  const declined = guests.filter((g) => g.rsvpStatus === "NO").length;
  const capLabel =
    weddingPlan!.plan === "FREE" ? `${guests.length} of ${FREE_LIMITS.maxGuests} (Free plan)` : `${guests.length} (unlimited on Pro)`;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-akoma-ink">Guest List</h1>
        <p className="mt-1 text-sm text-akoma-ink/60">
          Estimated {weddingPlan!.guestEstimate} guests — {capLabel} added so far.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <StatCard label="Total guests" value={String(guests.length)} />
          <StatCard label="Confirmed" value={String(confirmed)} />
          <StatCard label="Pending" value={String(pending)} />
          <StatCard label="Declined" value={String(declined)} />
        </div>
        <Card>
          <p className="mb-3 text-sm font-medium text-akoma-ink">RSVP breakdown</p>
          <RsvpPieChart confirmed={confirmed} pending={pending} declined={declined} />
        </Card>
      </div>

      <Card>
        <AddGuestForm weddingPlanId={weddingPlan!.id} />
      </Card>

      <Card>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-akoma-ink/10 text-xs uppercase tracking-wide text-akoma-ink/40">
              <th className="pb-2 font-medium">Guest</th>
              <th className="pb-2 font-medium">Side</th>
              <th className="pb-2 font-medium">RSVP</th>
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
