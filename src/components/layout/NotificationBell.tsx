// src/components/layout/NotificationBell.tsx
//
// Receives its initial list from TopBar.tsx (a Server Component — see
// lib/notifications.ts's getRecentNotifications), then manages read-state
// optimistically from there via markNotificationRead/markAllNotificationsRead.
// Dropdown uses the same click-outside-backdrop technique as Modal.tsx /
// MobileNavDrawer.tsx, just anchored under the bell instead of full-screen.

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { markNotificationRead, markAllNotificationsRead } from "@/server/actions/notifications";
import type { NotificationForDisplay } from "@/lib/notifications";
import { formatDate } from "@/lib/dates";

export function NotificationBell({
  weddingPlanId,
  initialNotifications,
  initialUnreadCount,
}: {
  weddingPlanId: string;
  initialNotifications: NotificationForDisplay[];
  initialUnreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [, startTransition] = useTransition();

  function handleMarkRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    startTransition(async () => {
      await markNotificationRead(id);
    });
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    startTransition(async () => {
      await markAllNotificationsRead(weddingPlanId);
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className="relative rounded-lg p-2 text-akoma-ink/70 hover:bg-akoma-ink/5"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-akoma-terracotta px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-akoma-ink/10 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-akoma-ink/10 px-4 py-3">
              <span className="font-medium text-akoma-ink">Notifications</span>
              {unreadCount > 0 && (
                <button type="button" onClick={handleMarkAllRead} className="text-xs font-medium text-akoma-green hover:underline">
                  Mark all as read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-akoma-ink/50">You&apos;re all caught up.</p>
              ) : (
                <ul className="divide-y divide-akoma-ink/5">
                  {notifications.map((n) => {
                    const rowClass = `block w-full px-4 py-3 text-left transition-colors hover:bg-akoma-ink/5 ${
                      n.isRead ? "" : "bg-akoma-green/5"
                    }`;
                    const content = (
                      <div className="flex items-start gap-2">
                        {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-akoma-green" />}
                        <div className={n.isRead ? "ml-3.5" : ""}>
                          <p className="text-sm text-akoma-ink">{n.message}</p>
                          <p className="mt-0.5 text-xs text-akoma-ink/40">{formatDate(n.createdAt)}</p>
                        </div>
                      </div>
                    );
                    return (
                      <li key={n.id}>
                        {n.actionHref ? (
                          <Link
                            href={n.actionHref}
                            onClick={() => {
                              handleMarkRead(n.id);
                              setOpen(false);
                            }}
                            className={rowClass}
                          >
                            {content}
                          </Link>
                        ) : (
                          <button type="button" onClick={() => handleMarkRead(n.id)} className={rowClass}>
                            {content}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
