// src/components/layout/Sidebar.tsx
//
// The app's primary navigation. Every feature described in the product
// spec has a nav entry here, whether or not the account has the Wedding
// Pass yet — Pass-only tools stay visible with a badge rather than being
// hidden, so the upgrade value is always obvious (the page behind the
// link does the actual gating via requirePass()) — UNLESS the account
// already has the Pass, in which case the badges would just be
// advertising a purchase that's already made, so they're hidden.
//
// Sign out lives here (footer, always visible, one click) rather than
// buried a page away — matches the Linear/Notion/Vercel-style pattern of
// pinning account controls to the bottom of the primary nav. The Settings
// page keeps its own Sign Out button too; harmless, common redundancy.
//
// The nav content is split out as SidebarContent so MobileNavDrawer.tsx
// can reuse the exact same markup inside a slide-in overlay on small
// screens — Sidebar itself (this component) is the desktop rail, hidden
// below the `sm` breakpoint.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { PassBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
import { signOut } from "@/server/actions/auth";

interface NavItem {
  href: string;
  label: string;
  passOnly?: boolean;
  /** Anchors the first-time guided tour (see src/components/tour/) to
   *  this nav link via a data-tour attribute — undefined for items the
   *  tour doesn't cover. */
  tourId?: string;
}

const CORE_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/budget", label: "Budget", tourId: "nav-budget" },
  { href: "/checklist", label: "Checklist", tourId: "nav-checklist" },
  { href: "/guests", label: "Guest List", tourId: "nav-guests" },
  { href: "/vendors", label: "Vendors", tourId: "nav-vendors" },
  { href: "/bisaai", label: "BisaAI", tourId: "nav-bisaai" },
  { href: "/calendar", label: "Calendar" },
  // Accommodation is free (see LEARNING.md) — lives with the core items,
  // not the Wedding Pass section below, so its nav placement matches its gating.
  { href: "/accommodation", label: "Accommodation" },
];

const PASS_ITEMS: NavItem[] = [
  { href: "/traditional-ceremony", label: "Traditional Ceremony", passOnly: true },
  { href: "/honeymoon", label: "Honeymoon", passOnly: true },
  { href: "/dress-tryon", label: "Dress Try-On", passOnly: true },
  { href: "/collaboration", label: "Collaboration", passOnly: true },
  { href: "/design", label: "Design Tools", passOnly: true },
  { href: "/vault", label: "Wedding Vault", passOnly: true },
];

export interface SidebarUser {
  name: string;
  profilePictureUrl: string | null;
}

export function Sidebar({ user, hasWeddingPass }: { user: SidebarUser; hasWeddingPass: boolean }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-akoma-ink/10 bg-white sm:flex">
      <SidebarContent user={user} hasWeddingPass={hasWeddingPass} />
    </aside>
  );
}

export function SidebarContent({
  user,
  hasWeddingPass,
  onNavigate,
}: {
  user: SidebarUser;
  hasWeddingPass: boolean;
  /** Called after any nav link is clicked — MobileNavDrawer uses this to close itself. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const showPassBadges = !hasWeddingPass;

  return (
    <>
      <Link href="/dashboard" className="shrink-0 px-6 py-4" onClick={onNavigate}>
        <Logo className="h-14 w-auto" />
      </Link>
      {/* min-h-0 is required alongside flex-1 for overflow-y-auto to
          actually kick in here instead of growing past the sticky
          h-screen aside's bounds (flex children default to min-height:
          auto, which ignores overflow otherwise). */}
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3">
        {CORE_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} showPassBadges={showPassBadges} onNavigate={onNavigate} />
        ))}
        <div className="my-3 border-t border-akoma-ink/10" />
        {PASS_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} showPassBadges={showPassBadges} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="shrink-0 space-y-0.5 px-3 pb-3">
        <div className="my-3 border-t border-akoma-ink/10" />
        <NavLink item={{ href: "/pricing", label: "Pricing" }} active={pathname.startsWith("/pricing")} showPassBadges={showPassBadges} onNavigate={onNavigate} />
        <NavLink item={{ href: "/profile", label: "Profile" }} active={pathname.startsWith("/profile")} showPassBadges={showPassBadges} onNavigate={onNavigate} />
        <NavLink
          item={{ href: "/settings", label: "Settings", tourId: "nav-settings" }}
          active={pathname.startsWith("/settings")}
          showPassBadges={showPassBadges}
          onNavigate={onNavigate}
        />
      </div>
      <div className="shrink-0 border-t border-akoma-ink/10 p-3">
        <div className="mb-2 flex items-center gap-2 px-1">
          <Avatar pictureUrl={user.profilePictureUrl} name={user.name} size="sm" />
          <span className="truncate text-sm font-medium text-akoma-ink">{user.name}</span>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-akoma-ink/70 transition-colors hover:bg-akoma-ink/5"
          >
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}

function NavLink({
  item,
  active,
  showPassBadges,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  showPassBadges: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      data-tour={item.tourId}
      className={clsx(
        "flex items-center justify-between rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-akoma-green/10 text-akoma-green" : "text-akoma-ink/70 hover:bg-akoma-ink/5"
      )}
    >
      <span>{item.label}</span>
      {item.passOnly && showPassBadges && <PassBadge />}
    </Link>
  );
}
