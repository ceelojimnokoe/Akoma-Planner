// src/components/guests/GuestRow.tsx
//
// One guest row: a native <select> for RSVP status (saves immediately on
// change) and a remove control. Optimistic on the select, same pattern as
// the checklist checkbox — an RSVP dropdown that visibly lags feels wrong.

"use client";

import { useState, useTransition } from "react";
import type { Guest, GuestGroup } from "@prisma/client";
import { updateGuestRsvp, deleteGuest } from "@/server/actions/guests";
import { updateGuestGroup } from "@/server/actions/seating";
import { Badge } from "@/components/ui/Badge";
import { GUEST_GROUP_LABEL, GUEST_GROUP_OPTIONS } from "@/lib/guest-group";
import clsx from "clsx";

const SIDE_LABEL: Record<Guest["side"], string> = { BRIDE: "Bride", GROOM: "Groom", BOTH: "Both" };
const RSVP_TONE: Record<Guest["rsvpStatus"], "green" | "terracotta" | "neutral"> = {
  YES: "green",
  NO: "terracotta",
  PENDING: "neutral",
};

export function GuestRow({ guest }: { guest: Guest }) {
  const [rsvpStatus, setRsvpStatus] = useState(guest.rsvpStatus);
  const [guestGroup, setGuestGroup] = useState<GuestGroup | null>(guest.guestGroup);
  const [isPending, startTransition] = useTransition();

  function handleRsvpChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Guest["rsvpStatus"];
    const prev = rsvpStatus;
    setRsvpStatus(next);
    startTransition(async () => {
      const result = await updateGuestRsvp(guest.id, next);
      if (!result.ok) setRsvpStatus(prev);
    });
  }

  function handleGroupChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = (e.target.value || null) as GuestGroup | null;
    const prev = guestGroup;
    setGuestGroup(next);
    startTransition(async () => {
      const result = await updateGuestGroup(guest.id, next);
      if (!result.ok) setGuestGroup(prev);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteGuest(guest.id);
    });
  }

  return (
    <tr className={clsx(isPending && "opacity-60")}>
      <td className="py-2.5 pr-4">
        <p className="text-sm font-medium text-akoma-ink">
          {guest.name}
          {guest.plusOne && <span className="ml-1 text-xs text-akoma-ink/40">+1</span>}
        </p>
        {guest.contact && <p className="text-xs text-akoma-ink/40">{guest.contact}</p>}
      </td>
      <td className="py-2.5 pr-4">
        <Badge tone="neutral">{SIDE_LABEL[guest.side]}</Badge>
      </td>
      <td className="py-2.5 pr-4">
        <select
          value={rsvpStatus}
          onChange={handleRsvpChange}
          className="rounded-md border border-akoma-ink/15 px-2 py-1 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        >
          <option value="PENDING">Pending</option>
          <option value="YES">Yes</option>
          <option value="NO">No</option>
        </select>
        <Badge tone={RSVP_TONE[rsvpStatus]} className="ml-2">
          {rsvpStatus === "YES" ? "Confirmed" : rsvpStatus === "NO" ? "Declined" : "Pending"}
        </Badge>
      </td>
      <td className="py-2.5 pr-4">
        <select
          value={guestGroup ?? ""}
          onChange={handleGroupChange}
          aria-label={`Group for ${guest.name}`}
          className="rounded-md border border-akoma-ink/15 px-2 py-1 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        >
          <option value="">No group</option>
          {GUEST_GROUP_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {GUEST_GROUP_LABEL[g]}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2.5 text-right">
        <button
          onClick={handleDelete}
          className="text-xs text-akoma-ink/40 hover:text-akoma-terracotta"
          aria-label={`Remove ${guest.name}`}
        >
          Remove
        </button>
      </td>
    </tr>
  );
}
