// src/components/layout/Sidebar.tsx
//
// The app's primary navigation. Every feature described in the product
// spec has a nav entry here, whether or not the current plan can use it —
// Pro-only tools stay visible with a Pro badge rather than being hidden,
// so the upgrade value is always obvious (the page behind the link does
// the actual gating via requirePro()).

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ProBadge } from "@/components/ui/Badge";

interface NavItem {
  href: string;
  label: string;
  proOnly?: boolean;
}

const CORE_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/budget", label: "Budget" },
  { href: "/checklist", label: "Checklist" },
  { href: "/guests", label: "Guest List" },
  { href: "/vendors", label: "Vendors" },
  { href: "/bisaai", label: "BisaAI" },
  { href: "/calendar", label: "Calendar" },
  // Accommodation is free (see LEARNING.md) — lives with the core items,
  // not the Pro section below, so its nav placement matches its gating.
  { href: "/accommodation", label: "Accommodation" },
];

const PRO_ITEMS: NavItem[] = [
  { href: "/traditional-list", label: "Traditional List", proOnly: true },
  { href: "/dress-tryon", label: "Dress Try-On", proOnly: true },
  { href: "/collaboration", label: "Collaboration", proOnly: true },
  { href: "/design", label: "Design Tools", proOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-akoma-ink/10 bg-white sm:flex sm:flex-col">
      <Link href="/" className="px-6 py-5 text-lg font-semibold text-akoma-green">
        AkomaPlanner
      </Link>
      <nav className="flex-1 space-y-1 px-3">
        {CORE_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
        <div className="my-3 border-t border-akoma-ink/10" />
        {PRO_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
      </nav>
      <div className="space-y-1 px-3 pb-5">
        <div className="my-3 border-t border-akoma-ink/10" />
        <NavLink item={{ href: "/pricing", label: "Pricing" }} active={pathname.startsWith("/pricing")} />
        <NavLink item={{ href: "/profile", label: "Profile" }} active={pathname.startsWith("/profile")} />
        <NavLink item={{ href: "/settings", label: "Settings" }} active={pathname.startsWith("/settings")} />
      </div>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={clsx(
        "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-akoma-green/10 text-akoma-green" : "text-akoma-ink/70 hover:bg-akoma-ink/5"
      )}
    >
      <span>{item.label}</span>
      {item.proOnly && <ProBadge />}
    </Link>
  );
}
