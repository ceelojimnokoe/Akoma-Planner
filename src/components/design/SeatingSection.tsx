// src/components/design/SeatingSection.tsx
//
// Interactive seating chart with two ways to move a guest: drag a chip
// onto a table (desktop/mouse — native HTML5 drag-and-drop, no new
// dependency), or click a chip then click a table (works everywhere,
// including touch — HTML5 drag-and-drop has no touch equivalent, so this
// stays the primary path on mobile rather than being replaced). Both
// converge on the same assignGuestToTable() call.
//
// "Guests per table" is fully client-side now: changing it calls
// repackSeatingArrangement() (server/actions/seating.ts) via
// useTransition and swaps in the returned fresh arrangement — no page
// navigation, fixing the earlier bug where changing this value after the
// first visit silently did nothing (see that action's header comment).
// Every repack — and the very first auto-seed — now clusters guests by
// guestGroup (Bride's Family, Bridesmaid, etc.) via lib/seating.ts's
// computeSeatingArrangement, not just by side.
//
// Guest-group tagging (Bride's family, VIP, etc.) is available right on
// each chip too — the same updateGuestGroup() action the Guest List page
// uses (src/components/guests/GuestRow.tsx), so a tag set in either place
// shows up in both.

"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Guest, GuestGroup, SeatingAssignment } from "@prisma/client";
import { assignGuestToTable, updateGuestGroup, repackSeatingArrangement } from "@/server/actions/seating";
import { GUEST_GROUP_LABEL, GUEST_GROUP_OPTIONS, GUEST_GROUP_TONE } from "@/lib/guest-group";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import clsx from "clsx";

type SeatedGuest = Guest & { seatingAssignment: SeatingAssignment | null };

const REPACK_DEBOUNCE_MS = 500;
const GUEST_DRAG_MIME = "text/akoma-guest-id";

export function SeatingSection({
  weddingPlanId,
  guests: initialGuests,
  tableSize: initialTableSize,
}: {
  weddingPlanId: string;
  guests: SeatedGuest[];
  tableSize: number;
}) {
  const [guests, setGuests] = useState(initialGuests);
  const [tableSize, setTableSize] = useState(initialTableSize);
  const [tableSizeInput, setTableSizeInput] = useState(String(initialTableSize));
  const [assignments, setAssignments] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(initialGuests.map((g) => [g.id, g.seatingAssignment?.tableNumber ?? null]))
  );
  const [groups, setGroups] = useState<Record<string, GuestGroup | null>>(() =>
    Object.fromEntries(initialGuests.map((g) => [g.id, g.guestGroup]))
  );
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [dragOverTable, setDragOverTable] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const repackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (repackTimer.current) clearTimeout(repackTimer.current);
    };
  }, []);

  const totalSeats = guests.reduce((sum, g) => sum + (g.plusOne ? 2 : 1), 0);
  const tableCount = Math.max(
    1,
    ...Object.values(assignments).filter((n): n is number => n !== null),
    Math.ceil(totalSeats / tableSize) || 1
  );
  const tableNumbers = Array.from({ length: tableCount }, (_, i) => i + 1);

  const unassigned = useMemo(() => guests.filter((g) => assignments[g.id] === null), [guests, assignments]);
  const byTable = useMemo(() => {
    const map = new Map<number, SeatedGuest[]>();
    for (const g of guests) {
      const table = assignments[g.id];
      if (table === null) continue;
      if (!map.has(table)) map.set(table, []);
      map.get(table)!.push(g);
    }
    return map;
  }, [guests, assignments]);

  function handleChipClick(guestId: string) {
    setSelectedGuestId((prev) => (prev === guestId ? null : guestId));
  }

  function assignToTable(guestId: string, tableNumber: number) {
    const previousTable = assignments[guestId];
    if (previousTable === tableNumber) return;
    setAssignments((prev) => ({ ...prev, [guestId]: tableNumber })); // optimistic
    startTransition(async () => {
      const result = await assignGuestToTable(guestId, weddingPlanId, tableNumber);
      if (!result.ok) setAssignments((prev) => ({ ...prev, [guestId]: previousTable })); // roll back on failure
    });
  }

  function handleTableClick(tableNumber: number) {
    if (!selectedGuestId) return;
    assignToTable(selectedGuestId, tableNumber);
    setSelectedGuestId(null);
  }

  function handleDrop(tableNumber: number, e: React.DragEvent) {
    e.preventDefault();
    setDragOverTable(null);
    const guestId = e.dataTransfer.getData(GUEST_DRAG_MIME);
    if (guestId) assignToTable(guestId, tableNumber);
    setSelectedGuestId(null);
  }

  function handleGroupChange(guestId: string, group: GuestGroup | null) {
    const prev = groups[guestId] ?? null;
    setGroups((p) => ({ ...p, [guestId]: group }));
    startTransition(async () => {
      const result = await updateGuestGroup(guestId, group);
      if (!result.ok) setGroups((p) => ({ ...p, [guestId]: prev }));
    });
  }

  function handleTableSizeInputChange(raw: string) {
    setTableSizeInput(raw);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 2 || parsed > 20) return;

    if (repackTimer.current) clearTimeout(repackTimer.current);
    repackTimer.current = setTimeout(() => {
      setTableSize(parsed);
      startTransition(async () => {
        const result = await repackSeatingArrangement(weddingPlanId, parsed);
        if (result.ok && result.guests) {
          setGuests(result.guests);
          setAssignments(Object.fromEntries(result.guests.map((g) => [g.id, g.seatingAssignment?.tableNumber ?? null])));
          setGroups(Object.fromEntries(result.guests.map((g) => [g.id, g.guestGroup])));
        }
      });
    }, REPACK_DEBOUNCE_MS);
  }

  // Reused for a guest wherever they appear — the unassigned pool AND
  // inside a table's own guest list — so a seated guest is exactly as
  // draggable/selectable (for reassigning to a different table) and
  // taggable as an unassigned one. Stops propagation on its own root: it
  // sits inside each table's click-to-assign container, and a click
  // meant to select/tag *this* guest must never also register as
  // "assign the currently-selected guest to this table."
  function GuestChip({ guest }: { guest: SeatedGuest }) {
    const group = groups[guest.id];
    const selected = selectedGuestId === guest.id;
    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(GUEST_DRAG_MIME, guest.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          "flex cursor-grab flex-col gap-1 rounded-lg border p-2 text-left transition active:cursor-grabbing",
          selected ? "border-akoma-green bg-akoma-green/10 ring-1 ring-akoma-green" : "border-akoma-ink/15 hover:border-akoma-green/50"
        )}
      >
        <button type="button" onClick={() => handleChipClick(guest.id)} className="text-left">
          <p className="text-sm font-medium text-akoma-ink">
            {guest.name}
            {guest.plusOne && <span className="ml-1 text-xs text-akoma-ink/40">+1</span>}
          </p>
          {group && (
            <Badge tone={GUEST_GROUP_TONE[group]} className="mt-1">
              {GUEST_GROUP_LABEL[group]}
            </Badge>
          )}
        </button>
        <select
          value={group ?? ""}
          onChange={(e) => handleGroupChange(guest.id, (e.target.value || null) as GuestGroup | null)}
          aria-label={`Group for ${guest.name}`}
          className="rounded border border-akoma-ink/10 bg-transparent px-1 py-0.5 text-[11px] text-akoma-ink/60 focus:border-akoma-green focus:outline-none"
        >
          <option value="">No group</option>
          {GUEST_GROUP_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {GUEST_GROUP_LABEL[g]}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <Card>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-akoma-ink">Seating chart</h2>
        <div className="flex items-center gap-2">
          <label htmlFor="table-size" className="text-xs font-medium text-akoma-ink/70">
            Guests per table
          </label>
          <input
            id="table-size"
            type="number"
            min={2}
            max={20}
            value={tableSizeInput}
            onChange={(e) => handleTableSizeInputChange(e.target.value)}
            className="w-16 rounded-lg border border-akoma-ink/15 px-2 py-1 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
          />
        </div>
      </div>
      <p className="mb-4 text-sm text-akoma-ink/60">
        {selectedGuestId
          ? "Now click a table to seat this guest."
          : "Drag a guest onto a table, or click a guest then click a table. Confirmed (RSVP: Yes) guests only."}
      </p>

      {guests.length === 0 ? (
        <p className="text-sm text-akoma-ink/50">No confirmed (RSVP: Yes) guests yet — seating needs confirmed guests first.</p>
      ) : (
        <div className={clsx("space-y-6", isPending && "opacity-80")}>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-akoma-ink/40">
              Unassigned ({unassigned.length})
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {unassigned.map((g) => (
                <GuestChip key={g.id} guest={g} />
              ))}
              {unassigned.length === 0 && <p className="text-xs text-akoma-ink/40">Everyone is seated.</p>}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-akoma-ink/40">Tables</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tableNumbers.map((tableNumber) => {
                const seated = byTable.get(tableNumber) ?? [];
                const seatsUsed = seated.reduce((sum, g) => sum + (g.plusOne ? 2 : 1), 0);
                const isDragOver = dragOverTable === tableNumber;
                return (
                  <div
                    key={tableNumber}
                    onClick={() => handleTableClick(tableNumber)}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={() => setDragOverTable(tableNumber)}
                    onDragLeave={() => setDragOverTable((prev) => (prev === tableNumber ? null : prev))}
                    onDrop={(e) => handleDrop(tableNumber, e)}
                    className={clsx(
                      "rounded-xl border-2 bg-white p-3.5 text-left shadow-sm transition",
                      isDragOver
                        ? "border-akoma-green bg-akoma-green/5"
                        : selectedGuestId
                          ? "cursor-pointer border-akoma-green/40 hover:border-akoma-green hover:bg-akoma-green/5"
                          : "border-akoma-ink/10"
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between border-b border-akoma-ink/10 pb-2">
                      <p className="text-base font-bold text-akoma-ink">Table {tableNumber}</p>
                      <span
                        className={clsx(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          seatsUsed > tableSize ? "bg-akoma-terracotta/10 text-akoma-terracotta" : "bg-akoma-ink/5 text-akoma-ink/50"
                        )}
                      >
                        {seatsUsed}/{tableSize} seats
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {seated.map((g) => (
                        <GuestChip key={g.id} guest={g} />
                      ))}
                      {seated.length === 0 && <p className="text-xs text-akoma-ink/30">Empty — drag or click here to seat a guest.</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
