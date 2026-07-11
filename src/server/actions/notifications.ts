// src/server/actions/notifications.ts
//
// Mutations for the notification dropdown (NotificationBell.tsx). Reading
// happens in TopBar.tsx (a Server Component) via lib/notifications.ts
// directly — these two actions are the only writes a user can trigger.

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markAllNotificationsRead(weddingPlanId: string): Promise<{ ok: boolean }> {
  await prisma.notification.updateMany({ where: { weddingPlanId, isRead: false }, data: { isRead: true } });
  revalidatePath("/", "layout");
  return { ok: true };
}
