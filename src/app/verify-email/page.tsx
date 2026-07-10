// src/app/verify-email/page.tsx
//
// Placeholder: no verification email is actually sent (see LEARNING.md).
// The "I've verified" button is a clearly-labelled demo shortcut
// (verifyEmailDemo()) that just flips User.emailVerified for whoever's
// currently signed in, rather than silently pretending a real email/token
// flow happened.

import { getCurrentUser } from "@/lib/session";
import { verifyEmailDemo } from "@/server/actions/auth";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Card } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { MockBadge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-akoma-cream">
      <PublicHeader backHref="/dashboard" backLabel="Skip for now" />
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <Card>
          <div className="mb-3 flex justify-center">
            <MockBadge />
          </div>
          <h1 className="text-xl font-bold text-akoma-ink">Verify your email</h1>
          <p className="mt-2 text-sm text-akoma-ink/60">
            We&apos;d send a verification link to <span className="font-medium text-akoma-ink">{user.email}</span> —
            no email is actually sent in this demo, so use the button below to simulate clicking it.
          </p>
          {user.emailVerified ? (
            <p className="mt-4 rounded-lg bg-akoma-green/10 px-3 py-2 text-sm text-akoma-green">
              Your email is already verified.
            </p>
          ) : (
            <form action={verifyEmailDemo} className="mt-4">
              <Button type="submit" className="w-full">
                I&apos;ve verified — continue
              </Button>
            </form>
          )}
          <LinkButton href="/dashboard" variant="ghost" size="sm" className="mt-3 w-full">
            Skip for now
          </LinkButton>
        </Card>
      </main>
    </div>
  );
}
