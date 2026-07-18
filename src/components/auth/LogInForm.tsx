// src/components/auth/LogInForm.tsx

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { logIn, type AuthResult } from "@/server/actions/auth";
import type { LogInInput } from "@/lib/validation/auth";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

const emptyForm: LogInInput = { email: "", password: "" };

// Keyed by the /login?error= value set by src/app/auth/callback/route.ts
// and src/app/auth/confirm/route.ts — each a distinct failure with its
// own honest message, instead of one hardcoded "Google" message shown
// for all of them regardless of what actually went wrong.
const REDIRECT_ERROR_MESSAGE: Record<string, string> = {
  oauth: "Something went wrong signing in with Google. Please try again.",
  confirm: "That confirmation link is invalid or has expired. Request a new one and try again.",
  sync: "You were signed in, but we hit a problem finishing setup. Please try logging in again.",
};

export function LogInForm({ oauthError }: { oauthError?: string }) {
  const [form, setForm] = useState(emptyForm);
  const [result, setResult] = useState<AuthResult<LogInInput> | null>(null);
  const [isPending, startTransition] = useTransition();
  const { guard, blocked } = useSubmitGuard();

  function update<K extends keyof LogInInput>(key: K, value: LogInInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(() =>
      guard(async () => {
        const response = await logIn(form);
        // On success the action redirects server-side; only failures
        // reach here. Keep the email so the visitor doesn't retype it,
        // but never keep a rejected password in state.
        setResult(response);
        setForm((prev) => ({ ...prev, password: "" }));
      })
    );
  }

  const redirectErrorMessage = oauthError ? (REDIRECT_ERROR_MESSAGE[oauthError] ?? REDIRECT_ERROR_MESSAGE.oauth) : null;

  return (
    <div className="space-y-5">
      {redirectErrorMessage && (
        <p className="rounded-lg bg-akoma-terracotta/10 px-3 py-2 text-sm text-akoma-terracotta">{redirectErrorMessage}</p>
      )}

      <GoogleSignInButton />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-akoma-ink/10" />
        <span className="text-xs text-akoma-ink/40">OR</span>
        <div className="h-px flex-1 bg-akoma-ink/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Email" error={result?.fieldErrors?.email}>
          <Input
            type="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field label="Password" error={result?.fieldErrors?.password}>
          <Input
            type="password"
            required
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            autoComplete="current-password"
          />
        </Field>

        {result?.error && (
          <p role="alert" className="rounded-lg bg-akoma-terracotta/10 px-3 py-2 text-sm text-akoma-terracotta">
            {result.error}
          </p>
        )}

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-akoma-ink/60 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" disabled={isPending || blocked} className="w-full">
          {isPending ? "Logging in…" : "Log in"}
        </Button>

        <p className="text-center text-sm text-akoma-ink/60">
          New to AkomaPlanner?{" "}
          <Link href="/signup" className="font-medium text-akoma-green hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
