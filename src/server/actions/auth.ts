// src/server/actions/auth.ts
//
// Server Actions for the real account layer — now backed entirely by
// Supabase Auth (see src/lib/supabase/) instead of a local password hash
// and an unsigned session cookie. Same overall shape as before (parse
// with zod, delegate the actual auth work, redirect on success) so
// LogInForm.tsx/SignUpForm.tsx barely had to change — only what happens
// inside these functions did.
//
// Error handling convention, applied consistently below: every message
// that can reach the browser goes through formatAuthError() (for a real
// Supabase AuthError) or is a fixed, hand-written string — never a raw
// caught exception, and never `undefined`/`null` coerced to text. See
// lib/auth-errors.ts's own header comment for why.

"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncLocalUser } from "@/lib/supabase/sync-user";
import { getSiteOrigin } from "@/lib/site-url";
import { formatAuthError, formatUnexpectedAuthError, logAuthServerError } from "@/lib/auth-errors";
import { signUpSchema, logInSchema, type SignUpInput, type LogInInput } from "@/lib/validation/auth";

export interface AuthResult<Input> {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof Input, string>>;
  /** True when sign-up succeeded but the Supabase project requires email
   *  confirmation before a session exists — there's nothing to redirect
   *  to yet, so the form shows a "check your inbox" state instead. */
  pendingEmailConfirmation?: boolean;
}

/**
 * Creates a real Supabase Auth account, syncs the local User row, and
 * signs the browser in — redirecting straight into onboarding, unless
 * the Supabase project requires email confirmation first, in which case
 * there's no session yet and the form handles that state itself.
 */
export async function signUp(rawInput: SignUpInput): Promise<AuthResult<SignUpInput>> {
  const parsed = signUpSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof SignUpInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof SignUpInput;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const { name, email, password } = parsed.data;
  const origin = await getSiteOrigin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      // Without this, Supabase falls back to whatever "Site URL" is set
      // in the dashboard — fine if that happens to match this
      // environment, wrong the moment it doesn't (e.g. a production
      // signup confirmation link landing on localhost). Always derive it
      // from the actual request instead. See src/app/auth/confirm/route.ts.
      emailRedirectTo: `${origin}/auth/confirm?next=/onboarding`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.message.toLowerCase().includes("already registered")) {
      return {
        ok: false,
        error: "That email is already registered.",
        fieldErrors: { email: "Already registered — try logging in instead." },
      };
    }
    return { ok: false, error: formatAuthError(error) };
  }
  if (!data.user) {
    return { ok: false, error: "Something went wrong creating your account. Please try again." };
  }

  try {
    await syncLocalUser(data.user);
  } catch (syncError) {
    // The Supabase account now genuinely exists — don't tell the visitor
    // signup failed (they'd hit "already registered" on retry, confusing
    // them further). Surface a real but safe error instead; the local
    // profile row self-heals on their next successful login/session
    // check (see lib/session.ts's getCurrentUserOrNull → syncLocalUser).
    logAuthServerError("signUp:syncLocalUser", syncError);
    return { ok: false, error: formatUnexpectedAuthError() };
  }

  if (!data.session) {
    return { ok: true, pendingEmailConfirmation: true };
  }

  redirect("/onboarding");
}

/**
 * Verifies credentials with Supabase and signs the browser in. Redirects
 * to /dashboard on success — that page's own layout already bounces a
 * user with no wedding plan yet to /onboarding, so this action doesn't
 * need to duplicate that check.
 */
export async function logIn(rawInput: LogInInput): Promise<AuthResult<LogInInput>> {
  const parsed = logInSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof LogInInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof LogInInput;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const { email, password } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, error: formatAuthError(error) };
  }
  if (!data.user) {
    return { ok: false, error: "Something went wrong signing you in. Please try again." };
  }

  try {
    await syncLocalUser(data.user);
  } catch (syncError) {
    // The Supabase credentials were genuinely correct — this is a local
    // sync failure (a transient DB hiccup, a race with a concurrent
    // request, ...), not a login failure. Distinguishing the two matters:
    // without this try/catch, syncLocalUser() throwing here was
    // completely unhandled — no try/catch anywhere in the call chain, no
    // error.tsx boundary above it (see src/app/error.tsx) — so a real
    // failure surfaced as a bare, unexplained exception instead of a
    // message, on an account/password that WAS correct.
    logAuthServerError("logIn:syncLocalUser", syncError);
    return { ok: false, error: formatUnexpectedAuthError() };
  }

  redirect("/dashboard");
}

/** Signs the current browser out of its real Supabase session. */
export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** Re-sends the real Supabase confirmation email — see /verify-email,
 *  which used to have a fake "click to verify" demo shortcut here
 *  instead. Requires an active session (the page itself is
 *  requireSession()-gated) so there's a real email to resend to. */
export async function resendVerificationEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  const origin = await getSiteOrigin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/dashboard` },
  });
  if (error) return { ok: false, error: formatAuthError(error) };
  return { ok: true };
}

/**
 * Sends a real Supabase password-reset email pointing at /reset-password
 * — replaces /forgot-password's old fully-fake local-state-only form.
 * Always returns ok:true regardless of whether the email exists or the
 * Supabase call itself fails (logged server-side instead) — Supabase
 * itself doesn't reveal whether an account exists either, and neither
 * should this endpoint's response shape. The one real security-relevant
 * behavior this flow needs, preserved from the old placeholder's own
 * stated design.
 */
export async function requestPasswordReset(email: string): Promise<{ ok: boolean }> {
  const origin = await getSiteOrigin();
  const supabase = await createSupabaseServerClient();

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` });
    if (error) logAuthServerError("requestPasswordReset", error);
  } catch (unexpected) {
    logAuthServerError("requestPasswordReset:unexpected", unexpected);
  }

  return { ok: true };
}
