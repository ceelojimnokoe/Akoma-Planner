// src/server/actions/seating.ts
//
// Persists the seating chart (SeatingAssignment) and guest grouping tags
// (Guest.guestGroup) — both previously nonexistent; the seating tool used
// to just render seatingSuggestions()'s fresh suggestion every render,
// nothing saved. getOrCreateSeatingAssignments() seeds real rows from a
// first-pass bin-pack the very first time a wedding's chart is opened;
// repackSeatingArrangement() is the explicit "regenerate now" action
// fired whenever the couple changes "Guests per table" afterward — the
// two used to be conflated (getOrCreateSeatingAssignments silently
// no-opped on every call after the first, so changing table size never
// did anything), which is exactly the bug this split fixes. Both call
// the same pure computeSeatingArrangement() (lib/seating.ts) rather than
// each hand-rolling their own bin-pack.

"use server";

import { revalidatePath } from "next/cache";
import type { GuestGroup } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePass } from "@/lib/plan";
import { computeSeatingArrangement } from "@/lib/seating";

export interface SeatingActionResult {
  ok: boolean;
  error?: string;
}

async function findConfirmedGuestsWithAssignments(weddingPlanId: string) {
  return prisma.guest.findMany({
    where: { weddingPlanId, rsvpStatus: "YES" },
    include: { seatingAssignment: true },
    orderBy: [{ side: "asc" }, { name: "asc" }],
  });
}

/** Returns every confirmed (RSVP: Yes) guest with their current table
 *  assignment, seeding assignments from a one-time smart bin-pack if
 *  this wedding has no saved assignments yet — so "persists after
 *  leaving and returning" is true from the first visit onward, not just
 *  after the couple's first manual edit. Does NOT re-pack on later
 *  calls even if tableSize differs from what was originally used —
 *  that's repackSeatingArrangement()'s job, fired explicitly when the
 *  couple changes "Guests per table," not implicitly on every read. */
export async function getOrCreateSeatingAssignments(weddingPlanId: string, tableSize: number) {
  const guests = await findConfirmedGuestsWithAssignments(weddingPlanId);

  const hasAnyAssignment = guests.some((g) => g.seatingAssignment);
  if (hasAnyAssignment || guests.length === 0) return guests;

  const placements = computeSeatingArrangement(guests, tableSize);
  await prisma.$transaction(
    placements.map((p) =>
      prisma.seatingAssignment.upsert({
        where: { guestId: p.guestId },
        create: { weddingPlanId, guestId: p.guestId, tableNumber: p.tableNumber },
        update: { tableNumber: p.tableNumber },
      })
    )
  );

  return findConfirmedGuestsWithAssignments(weddingPlanId);
}

export interface RepackResult extends SeatingActionResult {
  guests?: Awaited<ReturnType<typeof findConfirmedGuestsWithAssignments>>;
}

/** Regenerates the whole seating arrangement from scratch against a new
 *  "Guests per table" value — the fix for the bug where changing table
 *  size silently did nothing. Every confirmed guest is re-packed by
 *  computeSeatingArrangement() and every SeatingAssignment row is
 *  overwritten in one transaction; any manual rearranging done before
 *  this point is intentionally superseded (the same way changing the
 *  table size fundamentally changes what arrangement even makes sense —
 *  the couple can always rearrange again afterward). */
export async function repackSeatingArrangement(weddingPlanId: string, tableSize: number): Promise<RepackResult> {
  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: weddingPlanId } });
  const gate = requirePass(weddingPlan, "The seating chart");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  const guests = await findConfirmedGuestsWithAssignments(weddingPlanId);
  const placements = computeSeatingArrangement(guests, tableSize);

  await prisma.$transaction(
    placements.map((p) =>
      prisma.seatingAssignment.upsert({
        where: { guestId: p.guestId },
        create: { weddingPlanId, guestId: p.guestId, tableNumber: p.tableNumber },
        update: { tableNumber: p.tableNumber },
      })
    )
  );

  revalidatePath("/design");
  return { ok: true, guests: await findConfirmedGuestsWithAssignments(weddingPlanId) };
}

/** Assigns (or reassigns) one guest to a table — click-to-assign, no
 *  drag-and-drop. Upserts since a guest may not have a SeatingAssignment
 *  row yet (e.g. newly confirmed after the initial seed ran). */
export async function assignGuestToTable(
  guestId: string,
  weddingPlanId: string,
  tableNumber: number
): Promise<SeatingActionResult> {
  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: weddingPlanId } });
  const gate = requirePass(weddingPlan, "The seating chart");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  await prisma.seatingAssignment.upsert({
    where: { guestId },
    create: { weddingPlanId, guestId, tableNumber },
    update: { tableNumber },
  });
  revalidatePath("/design");
  return { ok: true };
}

/** Tags a guest with a relationship group (Bride's family, VIP, etc.) —
 *  callable both from inside the seating tool (quick tagging while
 *  arranging tables) and from the Guest List page (general management),
 *  one action shared by both call sites. Deliberately no requirePass()
 *  gate: the Guest List page is Free-tier, and gating the field itself
 *  would silently break tagging from that call site. */
export async function updateGuestGroup(
  guestId: string,
  group: GuestGroup | null
): Promise<SeatingActionResult> {
  await prisma.guest.update({ where: { id: guestId }, data: { guestGroup: group } });
  revalidatePath("/design");
  revalidatePath("/guests");
  return { ok: true };
}
