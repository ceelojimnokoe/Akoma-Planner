// src/app/auth/confirm/route.ts
//
// The redirect target for email-link auth flows that use Supabase's
// token_hash/type verification (signup confirmation, resend, and —
// defensively — password recovery if a Supabase email template is ever
// pointed here instead of straight at /reset-password). Distinct from
// /auth/callback, which only handles Google OAuth's ?code= exchange.
//
// Before this route existed, signUp()/resendVerificationEmail() didn't
// pass an explicit emailRedirectTo at all, so Supabase fell back to
// whatever "Site URL" happens to be configured in its dashboard — fine
// only if that always matches the environment the email was actually
// sent from. Now signUp()/resendVerificationEmail() (server/actions/
// auth.ts) both point here explicitly, built from the real request's own
// origin (see lib/site-url.ts), so this works the same way in local dev,
// a Vercel preview deployment, and production.
//
// A Route Handler (not a Server Component) for the same reason as
// /auth/callback: only these can write the session cookie Supabase's
// verification just issued.

import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncLocalUser } from "@/lib/supabase/sync-user";
import { logAuthServerError } from "@/lib/auth-errors";

const DEFAULT_NEXT_BY_TYPE: Partial<Record<EmailOtpType, string>> = {
  recovery: "/reset-password",
};

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? (type ? DEFAULT_NEXT_BY_TYPE[type] : undefined) ?? "/dashboard";

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error && data.user) {
      try {
        await syncLocalUser(data.user);
      } catch (syncError) {
        // The Supabase side of this (email confirmed / recovery session
        // established) genuinely succeeded — don't send them to a
        // confusing "link invalid" page over a local sync hiccup. Log it
        // and continue; syncLocalUser is defensively re-run on every
        // getCurrentUser() call too (see lib/session.ts), so the local
        // row still self-heals on the very next request.
        logAuthServerError("auth/confirm:syncLocalUser", syncError);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }

    if (error) logAuthServerError("auth/confirm:verifyOtp", error);
  }

  return NextResponse.redirect(`${origin}/login?error=confirm`);
}
