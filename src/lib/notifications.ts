// src/lib/notifications.ts
//
// Real notification rows (see prisma/schema.prisma's Notification model
// comment for the full "why a real table, not computed-on-render" case).
// Two kinds of writer, both funneled through createNotification():
//
//   1. Event-based — called once, at the moment something happens
//      (see server/actions/wedding.ts, server/actions/profile.ts).
//   2. State-derived — syncComputedNotifications() below, re-run on every
//      app-shell render (see (app)/layout.tsx via TopBar), upserts a
//      fixed set of "facts about the wedding right now" keyed so re-runs
//      never duplicate or silently un-read something the couple already saw.
//
// createNotification() is the one seam a future email/WhatsApp/Telegram/
// push/SMS integration would hook into — dispatch to a real channel would
// go right after the upsert, still writing the in-app row first. Not
// built now; left obvious, same as the provider swap points documented
// in lib/bisaai.ts and server/actions/billing.ts.

import { prisma } from "./prisma";
import { calculateBudgetSummary } from "./budget";
import { calculateGuestStats } from "./guests";
import { getBudgetTone } from "./budget-tone";
import { daysUntil } from "./dates";
import { ONBOARDING_VENDOR_CATEGORIES } from "./validation/wedding";
import type { NotificationType } from "@prisma/client";

const COUNTDOWN_MILESTONES = [180, 120, 90, 60, 30, 14, 7, 1];
const VENDOR_BOOKING_REMINDER_WINDOW_DAYS = 90;
const STALE_RSVP_DAYS = 14;

interface NotificationInput {
  weddingPlanId: string;
  key: string;
  type: NotificationType;
  message: string;
  actionHref?: string;
}

/**
 * The one write path for every notification, event-based or computed.
 * Upserts on [weddingPlanId, key]: a brand-new key creates an unread row;
 * an existing key only has its message refreshed (a live count like
 * "12 pending RSVPs" needs to stay accurate) — isRead and createdAt are
 * never touched on update, so marking something read actually sticks
 * across re-syncs.
 */
export async function createNotification(input: NotificationInput): Promise<void> {
  await prisma.notification.upsert({
    where: { weddingPlanId_key: { weddingPlanId: input.weddingPlanId, key: input.key } },
    create: {
      weddingPlanId: input.weddingPlanId,
      key: input.key,
      type: input.type,
      message: input.message,
      actionHref: input.actionHref,
    },
    update: {
      message: input.message,
      actionHref: input.actionHref,
    },
  });
}

/**
 * Derives the current true set of "facts worth surfacing" from live data
 * and upserts each one. Cheap enough to call on every app-shell render
 * (a handful of already-cheap queries on a small per-wedding dataset) —
 * see TopBar.tsx.
 */
export async function syncComputedNotifications(weddingPlanId: string): Promise<void> {
  const [weddingPlan, budgetCategories, guests, checklistItems, vendorBookingStatuses] = await Promise.all([
    prisma.weddingPlan.findUniqueOrThrow({ where: { id: weddingPlanId } }),
    prisma.budgetCategory.findMany({ where: { weddingPlanId } }),
    prisma.guest.findMany({ where: { weddingPlanId } }),
    prisma.checklistItem.findMany({ where: { weddingPlanId } }),
    prisma.vendorBookingStatus.findMany({ where: { weddingPlanId } }),
  ]);

  const jobs: Promise<void>[] = [];

  // --- Budget ---
  const budget = calculateBudgetSummary(weddingPlan.totalBudgetGHS, budgetCategories);
  if (getBudgetTone(budget.percentSpent) === "terracotta") {
    jobs.push(
      createNotification({
        weddingPlanId,
        key: "budget-over",
        type: "BUDGET",
        message: `You've gone over budget (${Math.round(budget.percentSpent)}% spent). BisaAI has recommendations to help reduce costs.`,
        actionHref: "/bisaai",
      })
    );
  } else if (budget.percentSpent >= 80) {
    jobs.push(
      createNotification({
        weddingPlanId,
        key: "budget-80",
        type: "BUDGET",
        message: `You've used ${Math.round(budget.percentSpent)}% of your wedding budget. BisaAI has recommendations to help reduce costs.`,
        actionHref: "/bisaai",
      })
    );
  }

  // --- Guests ---
  const guestStats = calculateGuestStats(guests);
  if (guestStats.pendingAttendees > 0) {
    jobs.push(
      createNotification({
        weddingPlanId,
        key: "guests-pending",
        type: "GUEST",
        message: `You have ${guestStats.pendingAttendees} pending RSVP response${guestStats.pendingAttendees === 1 ? "" : "s"} to follow up.`,
        actionHref: "/guests",
      })
    );
  }
  const staleCutoff = new Date(Date.now() - STALE_RSVP_DAYS * 24 * 60 * 60 * 1000);
  const staleCount = guests.filter((g) => g.rsvpStatus === "PENDING" && g.createdAt < staleCutoff).length;
  if (staleCount > 0) {
    jobs.push(
      createNotification({
        weddingPlanId,
        key: "guests-stale",
        type: "GUEST",
        message: `${staleCount} guest${staleCount === 1 ? " hasn't" : "s haven't"} responded in over ${STALE_RSVP_DAYS} days.`,
        actionHref: "/guests",
      })
    );
  }

  // --- Wedding countdown milestones ---
  const days = daysUntil(weddingPlan.weddingDate);
  const milestone = COUNTDOWN_MILESTONES.find((m) => days === m);
  if (milestone !== undefined) {
    jobs.push(
      createNotification({
        weddingPlanId,
        key: `wedding-countdown-${milestone}`,
        type: "WEDDING",
        message: `${milestone} day${milestone === 1 ? "" : "s"} until your wedding!`,
      })
    );
  }

  // --- Vendors not yet booked, once it's getting close ---
  if (days >= 0 && days <= VENDOR_BOOKING_REMINDER_WINDOW_DAYS) {
    const bookedCategories = new Set<string>(
      vendorBookingStatuses.filter((v) => v.status === "BOOKED").map((v) => v.category)
    );
    for (const category of ONBOARDING_VENDOR_CATEGORIES) {
      if (!bookedCategories.has(category.value)) {
        jobs.push(
          createNotification({
            weddingPlanId,
            key: `vendor-${category.value}-not-booked`,
            type: "VENDOR",
            message: `${category.label} has not yet been booked.`,
            actionHref: "/vendors",
          })
        );
      }
    }
  }

  // --- Checklist: due soon or overdue ---
  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  for (const item of checklistItems) {
    if (item.done || !item.dueDate) continue;
    if (item.dueDate <= inSevenDays) {
      const overdue = item.dueDate < now;
      jobs.push(
        createNotification({
          weddingPlanId,
          key: `checklist-${item.id}-due`,
          type: "TASK",
          message: overdue ? `"${item.title}" is overdue.` : `"${item.title}" is due this week.`,
          actionHref: "/checklist",
        })
      );
    }
  }

  await Promise.all(jobs);
}

export interface NotificationForDisplay {
  id: string;
  type: NotificationType;
  message: string;
  actionHref: string | null;
  isRead: boolean;
  createdAt: Date;
}

export async function getRecentNotifications(
  weddingPlanId: string,
  limit = 20
): Promise<{ notifications: NotificationForDisplay[]; unreadCount: number }> {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { weddingPlanId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { weddingPlanId, isRead: false } }),
  ]);
  return { notifications, unreadCount };
}
