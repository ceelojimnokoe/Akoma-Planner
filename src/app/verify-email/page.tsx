// src/app/verify-email/page.tsx
//
// A real confirmation email is genuinely sent by Supabase Auth on
// sign-up (and again from here, via resendVerificationEmail()) — this
// page used to have a fake "click to verify" demo shortcut instead
// (verifyEmailDemo(), now removed); it's a real "check your inbox" /
// resend page now. user.emailVerified is synced from Supabase's actual
// email_confirmed_at (see lib/supabase/sync-user.ts), so this page
// reflects genuine state, not a flag anyone could flip themselves.

import { requireSession } from "@/lib/session";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { ResendVerificationButton } from "@/components/auth/ResendVerificationButton";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage() {
  const user = await requireSession();

  return (
    <div className="min-h-screen bg-akoma-cream">
      <PublicHeader backHref="/dashboard" backLabel="Skip for now" />
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <Card>
          <h1 className="text-xl font-bold text-akoma-ink">Verify your email</h1>
          <p className="mt-2 text-sm text-akoma-ink/60">
            We sent a confirmation link to <span className="font-medium text-akoma-ink">{user.email}</span>. Click it to
            verify your account.
          </p>
          {user.emailVerified ? (
            <p className="mt-4 rounded-lg bg-akoma-green/10 px-3 py-2 text-sm text-akoma-green">
              Your email is already verified.
            </p>
          ) : (
            <ResendVerificationButton email={user.email} />
          )}
          <LinkButton href="/dashboard" variant="ghost" size="sm" className="mt-3 w-full">
            Skip for now
          </LinkButton>
        </Card>
      </main>
    </div>
  );
}
