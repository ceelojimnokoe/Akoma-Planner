// src/app/(app)/error.tsx
//
// Same safety net as src/app/error.tsx, scoped to the signed-in app
// shell — links back to /dashboard instead of the marketing home page.
// Note this does NOT catch an error thrown inside (app)/layout.tsx
// itself (Next.js error boundaries never catch errors from their own
// segment's layout, only from the page/children below it) — that's
// exactly where getCurrentUser()/getCurrentWeddingPlan() run on every
// request, so a failure there (e.g. syncLocalUser()) is still caught by
// the root error.tsx instead. This one covers a failure in an individual
// page under (app) (a page-level Prisma query, etc).

"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(JSON.stringify({ scope: "error-boundary:app", message: error.message, digest: error.digest }));
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
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
          <LinkButton href="/dashboard" variant="ghost" size="sm">
            Back to dashboard
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}
