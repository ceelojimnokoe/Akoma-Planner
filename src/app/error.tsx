// src/app/error.tsx
//
// Root error boundary — the safety net for any uncaught exception in a
// Server Component, Server Action, or render below the root layout that
// Next.js doesn't already have a more specific boundary for. Added
// alongside the auth fixes because syncLocalUser() (lib/supabase/
// sync-user.ts) — called from every login/signup/OAuth path — used to
// have no try/catch anywhere in its call chain and no boundary like this
// above it: a real failure there surfaced as a bare, unstyled default
// error page instead of a message a visitor could act on. Client
// Component: Next.js requires error.tsx to be one, since it needs to
// catch errors thrown during render.
//
// Deliberately generic — this catches *everything* unhandled, not just
// auth, so it never assumes a specific cause. See src/app/(app)/error.tsx
// for the signed-in-shell equivalent (adds a link back to the dashboard
// instead of home).

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Secret-safe: only the error's own message/digest, never request
    // state — same convention as lib/auth-errors.ts's logAuthServerError.
    console.error(JSON.stringify({ scope: "error-boundary", message: error.message, digest: error.digest }));
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-akoma-cream px-6 py-16">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="mb-6 inline-block">
          <Logo className="h-12 w-auto" />
        </Link>
        <Card>
          <h1 className="text-lg font-semibold text-akoma-ink">Something went wrong</h1>
          <p className="mt-2 text-sm text-akoma-ink/60">
            We hit an unexpected problem loading this page. Nothing you did caused this — please try again.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={reset}
              className="w-full rounded-lg bg-akoma-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-akoma-green/90"
            >
              Try again
            </button>
            <LinkButton href="/" variant="ghost" size="sm">
              Back home
            </LinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}
