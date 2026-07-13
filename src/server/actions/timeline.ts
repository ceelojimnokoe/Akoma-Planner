// src/server/actions/timeline.ts
//
// Persists the wedding-day timeline that used to be pure compute-on-
// render (generateTimeline() in lib/bisaai.ts, called fresh every page
// load, nothing saved). getOrCreateTimeline() is the one seam that
// bridges the two: seeds real TimelineEntry rows from that same default
// template the first time a wedding plan is opened here, and every call
// after that just reads what's already saved — including any edits.
//
// Note the naming collision this file has to live with: lib/bisaai.ts
// already exports an interface called TimelineEntry (the plain
// {time, activity, durationMinutes} shape generateTimeline() returns) —
// unrelated to, but same-named as, the new Prisma TimelineEntry model.
// Neither name is renamed here (bisaai.ts's interface is established and
// used elsewhere; the Prisma model name is already pushed) — this file
// just never imports both under the same identifier.

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePass } from "@/lib/plan";
import { generateTimeline } from "@/lib/bisaai";

async function getWeddingPlan(weddingPlanId: string) {
  return prisma.weddingPlan.findUniqueOrThrow({ where: { id: weddingPlanId } });
}

/** Returns the wedding's persisted timeline, seeding it from
 *  generateTimeline()'s default template on first access. Every call
 *  after the first just reads the saved (possibly edited) rows. */
export async function getOrCreateTimeline(weddingPlanId: string) {
  const existing = await prisma.timelineEntry.findMany({
    where: { weddingPlanId },
    orderBy: { sortOrder: "asc" },
  });
  if (existing.length > 0) return existing;

  const result = await generateTimeline({ weddingPlanId, startTime: "09:00" });
  if (!result.ok) return [];

  await prisma.timelineEntry.createMany({
    data: result.data.entries.map((entry, index) => ({
      weddingPlanId,
      time: entry.time,
      activity: entry.activity,
      durationMinutes: entry.durationMinutes,
      sortOrder: index,
    })),
  });

  return prisma.timelineEntry.findMany({ where: { weddingPlanId }, orderBy: { sortOrder: "asc" } });
}

export interface TimelineActionResult {
  ok: boolean;
  error?: string;
}

/** Edits an existing entry's time and/or activity — auto-saved on blur
 *  from the client, no explicit "save" step. Scope is deliberately just
 *  editing what's already there (time/activity/order) — no add/delete,
 *  matching exactly what was asked for. */
export async function updateTimelineEntry(
  entryId: string,
  weddingPlanId: string,
  data: { time?: string; activity?: string }
): Promise<TimelineActionResult> {
  const weddingPlan = await getWeddingPlan(weddingPlanId);
  const gate = requirePass(weddingPlan, "The wedding day timeline");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  await prisma.timelineEntry.update({ where: { id: entryId }, data });
  revalidatePath("/design");
  return { ok: true };
}

/** Swaps a timeline entry with its immediate neighbor (direction -1 for
 *  up/earlier, +1 for down/later) — up/down buttons, not drag-and-drop,
 *  matching this codebase's established no-new-dependency-for-small-
 *  things pattern. Both rows' sortOrder are swapped in one transaction;
 *  see the schema's own comment on why there's no hard unique constraint
 *  on sortOrder guarding this. */
export async function reorderTimelineEntry(
  entryId: string,
  weddingPlanId: string,
  direction: -1 | 1
): Promise<TimelineActionResult> {
  const weddingPlan = await getWeddingPlan(weddingPlanId);
  const gate = requirePass(weddingPlan, "The wedding day timeline");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  const entries = await prisma.timelineEntry.findMany({ where: { weddingPlanId }, orderBy: { sortOrder: "asc" } });
  const index = entries.findIndex((e) => e.id === entryId);
  const swapIndex = index + direction;
  if (index === -1 || swapIndex < 0 || swapIndex >= entries.length) {
    return { ok: false, error: "Can't move this entry any further." };
  }

  const current = entries[index];
  const swapWith = entries[swapIndex];

  await prisma.$transaction([
    prisma.timelineEntry.update({ where: { id: current.id }, data: { sortOrder: swapWith.sortOrder } }),
    prisma.timelineEntry.update({ where: { id: swapWith.id }, data: { sortOrder: current.sortOrder } }),
  ]);

  revalidatePath("/design");
  return { ok: true };
}
