// src/components/dashboard/PendingGuestsCard.tsx
//
// Replaces the old "Upcoming tasks" dashboard card, which duplicated
// This Week's Focus (both were checklist-driven). This one looks at a
// different tool entirely — the guest list — surfacing who still needs
// an RSVP follow-up. Presentational only: dashboard/page.tsx does the
// selecting/sorting via lib/guests.ts's selectPendingGuestFollowUps, this
// component just renders the result.

import { daysUntil } from "@/lib/dates";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";

export interface PendingGuestRow {
  id: string;
  name: string;
  createdAt: Date;
}

export function PendingGuestsCard({
  pendingCount,
  pendingGuests,
}: {
  pendingCount: number;
  pendingGuests: PendingGuestRow[];
}) {
  return (
    <Card className="lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-akoma-ink">Pending guest confirmations ({pendingCount})</h2>
          <p className="text-xs text-akoma-ink/50">Waiting longest first — these are the easiest wins to chase down.</p>
        </div>
        <LinkButton href="/guests" variant="ghost" size="sm">
          View guest list →
        </LinkButton>
      </div>

      {pendingGuests.length === 0 ? (
        <p className="text-sm text-akoma-ink/60">No pending RSVPs — everyone has responded.</p>
      ) : (
        <ul className="divide-y divide-akoma-ink/10">
          {pendingGuests.map((guest) => {
            const daysPending = Math.abs(daysUntil(guest.createdAt));
            return (
              <li key={guest.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm font-medium text-akoma-ink">{guest.name}</span>
                <Badge tone="neutral">Pending {daysPending === 0 ? "today" : `${daysPending}d`}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
