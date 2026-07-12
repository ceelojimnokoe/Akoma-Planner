// src/server/actions/auth.ts
//
// Server Actions for the real account layer — now backed entirely by
// Supabase Auth (see src/lib/supabase/) instead of a local password hash
// and an unsigned session cookie. Same overall shape as before (parse
// with zod, delegate the actual auth work, redirect on success) so
// LogInForm.tsx/SignUpForm.tsx barely had to change — only what happens
// inside these functions did.

"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncLocalUser } from "@/lib/supabase/sync-user";
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
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("already registered") || message.includes("already exists")) {
      return {
        ok: false,
        error: "That email is already registered.",
        fieldErrors: { email: "Already registered — try logging in instead." },
      };
    }
    return { ok: false, error: error.message };
  }
  if (!data.user) {
    return { ok: false, error: "Something went wrong creating your account. Please try again." };
  }

  await syncLocalUser(data.user);

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
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { ok: false, error: "Please confirm your email before logging in — check your inbox for the confirmation link." };
    }
    // Deliberately the same generic message whether the email doesn't
    // exist or the password is wrong — never reveal which one it was.
    return { ok: false, error: "That email and password don't match." };
  }
  if (!data.user) {
    return { ok: false, error: "Something went wrong signing you in. Please try again." };
  }

  await syncLocalUser(data.user);
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
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Sends a real Supabase password-reset email pointing at /reset-password
 * — replaces /forgot-password's old fully-fake local-state-only form.
 * Always returns ok:true regardless of whether the email exists
 * (Supabase itself doesn't reveal that either) — the one real
 * security-relevant behavior this flow needs, preserved from the old
 * placeholder's own stated design.
 */
export async function requestPasswordReset(email: string): Promise<{ ok: boolean }> {
  const host = (await headers()).get("host");
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? `http://${host}`;

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` });
  return { ok: true };
}
