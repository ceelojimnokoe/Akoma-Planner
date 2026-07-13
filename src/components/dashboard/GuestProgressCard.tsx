// src/components/dashboard/GuestProgressCard.tsx
//
// Thin wrapper around the Guest List page's real RsvpPieChart — used to
// be its own hand-rolled 2-segment "confirmed vs. estimate" donut, but
// that meant this card and the Guest List page could visually disagree
// about what "guest progress" even shows. Reusing RsvpPieChart directly
// guarantees identical colors/proportions/style by construction.

import { Card } from "@/components/ui/Card";
import { RsvpPieChart } from "@/components/guests/RsvpPieChart";

export function GuestProgressCard({
  confirmedAttendees,
  pendingAttendees,
  declinedAttendees,
}: {
  confirmedAttendees: number;
  pendingAttendees: number;
  declinedAttendees: number;
}) {
  return (
    <Card>
      <h2 className="mb-3 font-semibold text-akoma-ink">Guests confirmed</h2>
      <RsvpPieChart confirmed={confirmedAttendees} pending={pendingAttendees} declined={declinedAttendees} />
    </Card>
  );
}
