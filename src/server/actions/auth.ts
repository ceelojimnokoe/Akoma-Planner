// src/server/actions/auth.ts
//
// Server Actions for the real (but lightweight) account layer — see
// lib/auth.ts for what "real" means here. Same shape as
// server/actions/wedding.ts: parse with zod, apply the one business rule
// that applies (email already taken / credentials don't match), delegate
// the write to Prisma, done.

"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hashPassword, verifyPassword, createSession, destroySession } from "@/lib/auth";
import { signUpSchema, logInSchema, type SignUpInput, type LogInInput } from "@/lib/validation/auth";

export interface AuthResult<Input> {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof Input, string>>;
}

/**
 * Creates a real account and signs the browser in immediately. Redirects
 * straight into the onboarding wizard on success, so callers only need to
 * handle the failure case.
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

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      ok: false,
      error: "That email is already registered.",
      fieldErrors: { email: "Already registered — try logging in instead." },
    };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, authProvider: "EMAIL" },
  });

  await createSession(user.id);
  redirect("/onboarding");
}

/**
 * Verifies credentials against the stored password hash and signs the
 * browser in. Redirects to /dashboard on success — that page's own layout
 * already bounces a user with no wedding plan yet to /onboarding, so this
 * action doesn't need to duplicate that check.
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

  // Deliberately the same generic message whether the email doesn't exist,
  // has no password (a stub/social account), or the password is wrong —
  // never reveal which one it was.
  const genericError = "That email and password don't match.";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return { ok: false, error: genericError };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: genericError };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

/** Clears the session cookie. The app falls back to the seeded demo account afterward — see lib/session.ts. */
export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/");
}

/**
 * Demo-only stand-in for clicking a real verification link (no email is
 * ever sent — see /verify-email). Clearly a shortcut, not a real
 * verification flow: it just flips the flag for whoever's currently
 * signed in.
 */
export async function verifyEmailDemo(): Promise<void> {
  const user = await getCurrentUser();
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  redirect("/dashboard");
}
