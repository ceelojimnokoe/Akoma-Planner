// src/components/layout/PublicHeader.tsx
//
// Shared logo + back-link header for pages outside the (app) shell that
// need one (signup, login, forgot-password, verify-email). Extracted from
// what "/", "/pricing", and "/checkout" each used to hand-roll slightly
// differently — the root layout (app/layout.tsx) deliberately supplies no
// chrome of its own, so every top-level route builds its own.

import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function PublicHeader({ backHref = "/", backLabel = "Back home" }: { backHref?: string; backLabel?: string }) {
  return (
    <header className="border-b border-akoma-ink/10 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/">
          <Logo className="h-12 w-auto" />
        </Link>
        <Link href={backHref} className="text-sm text-akoma-ink/60 hover:underline">
          {backLabel}
        </Link>
      </div>
    </header>
  );
}
