// src/server/actions/guests.ts
//
// Mutations for the Guest List tool. addGuest is the one place the
// Free-plan 100-guest cap (lib/plan.ts canAddGuest) applies — editing
// RSVP status or removing an existing guest is always allowed regardless
// of plan, same reasoning as the checklist cap.

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canAddGuest } from "@/lib/plan";

const addGuestSchema = z.object({
  weddingPlanId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(100),
  side: z.enum(["BRIDE", "GROOM", "BOTH"]),
  contact: z.string().trim().max(50).optional().or(z.literal("")),
  plusOne: z.boolean().default(false),
});

export async function addGuest(input: {
  weddingPlanId: string;
  name: string;
  side: "BRIDE" | "GROOM" | "BOTH";
  contact?: string;
  plusOne?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = addGuestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: parsed.data.weddingPlanId } });
  const existingCount = await prisma.guest.count({ where: { weddingPlanId: parsed.data.weddingPlanId } });
  const gate = canAddGuest(weddingPlan.plan, existingCount);
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  await prisma.guest.create({
    data: {
      weddingPlanId: parsed.data.weddingPlanId,
      name: parsed.data.name,
      side: parsed.data.side,
      contact: parsed.data.contact || null,
      plusOne: parsed.data.plusOne ?? false,
    },
  });

  revalidatePath("/guests");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateGuestRsvp(id: string, rsvpStatus: "PENDING" | "YES" | "NO"): Promise<{ ok: boolean }> {
  await prisma.guest.update({ where: { id }, data: { rsvpStatus } });
  revalidatePath("/guests");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteGuest(id: string): Promise<{ ok: boolean }> {
  await prisma.guest.delete({ where: { id } });
  revalidatePath("/guests");
  revalidatePath("/dashboard");
  return { ok: true };
}
