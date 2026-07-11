// src/app/w/[shareToken]/page.tsx
//
// Public, read-only wedding summary — no auth, reachable by anyone with
// the link. Deliberately shows only celebratory/logistical information
// (names, date, city, tradition, countdown, checklist progress, an RSVP
// headcount) and nothing private: no budget figures, no individual guest
// list, no vendor quotes or negotiation state. That's a privacy choice,
// not just a scope-cut — see LEARNING.md.

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { daysUntil, formatDate } from "@/lib/dates";
import { calculateGuestStats } from "@/lib/guests";
import { Badge } from "@/components/ui/Badge";

export default async function SharedWeddingPage({ params }: { params: Promise<{ shareToken: string }> }) {
  const { shareToken } = await params;
  const weddingPlan = await prisma.weddingPlan.findUnique({ where: { shareToken } });
  if (!weddingPlan) notFound();

  const [checklistItems, guests] = await Promise.all([
    prisma.checklistItem.findMany({ where: { weddingPlanId: weddingPlan.id } }),
    prisma.guest.findMany({ where: { weddingPlanId: weddingPlan.id } }),
  ]);

  const doneCount = checklistItems.filter((i) => i.done).length;
  const checklistPercent = checklistItems.length ? Math.round((doneCount / checklistItems.length) * 100) : 0;
  const { confirmedAttendees } = calculateGuestStats(guests);
  const days = daysUntil(weddingPlan.weddingDate);

  return (
    <div className="flex min-h-screen items-center justify-center bg-akoma-cream px-6 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-akoma-gold/30 bg-white p-8 text-center shadow-sm">
        <Badge tone="gold" className="mb-4">
          {weddingPlan.tradition} Wedding
        </Badge>
        <h1 className="text-3xl font-bold text-akoma-ink">{weddingPlan.coupleNames}</h1>
        <p className="mt-2 text-akoma-ink/60">
          {formatDate(weddingPlan.weddingDate)} · {cityLabel(weddingPlan.city)}
        </p>

        <div className="mt-8 grid grid-cols-3 gap-4 border-t border-akoma-ink/10 pt-6">
          <Stat label="Countdown" value={days >= 0 ? `${days}d` : "🎉"} />
          <Stat label="Guests confirmed" value={String(confirmedAttendees)} />
          <Stat label="Planning progress" value={`${checklistPercent}%`} />
        </div>

        <p className="mt-8 text-xs text-akoma-ink/40">
          Shared via AkomaPlanner — this page shows only public celebration details, not budget or guest information.
        </p>
      </div>
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
