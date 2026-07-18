// src/app/reset-password/page.tsx
//
// The redirect target for the real password-reset email
// (requestPasswordReset() in server/actions/auth.ts). A Client Component
// specifically because the recovery session only gets established in the
// *browser* — createSupabaseBrowserClient() auto-detects the token/code
// Supabase put in this page's URL (detectSessionInUrl, on by default)
// the moment it's constructed, regardless of whether the project uses
// the hash-fragment or PKCE ?code= flow; this page doesn't need to know
// which. Deliberately outside middleware's protected-route list — the
// one-time recovery link *is* the credential here, there's no normal
// session yet.

"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatAuthError } from "@/lib/auth-errors";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

type Status = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { guard, blocked } = useSubmitGuard();
  const router = useRouter();

  useEffect(() => {
    // Dynamically imported: see GoogleSignInButton.tsx's own comment — the
    // supabase-js SDK is the biggest chunk on this route, and deferring it
    // to a lazy import keeps it out of the initial First Load JS even
    // though it's still fetched immediately on mount right after.
    import("@/lib/supabase/client").then(({ createSupabaseBrowserClient }) => {
      const supabase = createSupabaseBrowserClient();
      supabase.auth.getSession().then(({ data }) => {
        setStatus(data.session ? "ready" : "invalid");
      });
    });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    startTransition(() =>
      guard(async () => {
        const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
        const supabase = createSupabaseBrowserClient();
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          // Never the raw Supabase message (e.g. a stale/expired
          // recovery session reads as a cryptic JWT error) — see
          // lib/auth-errors.ts.
          setError(formatAuthError(updateError));
          setPassword("");
          setConfirmPassword("");
          return;
        }
        setStatus("done");
        setTimeout(() => router.push("/dashboard"), 1500);
      })
    );
  }

  return (
    <div className="min-h-screen bg-akoma-cream">
      <PublicHeader backHref="/login" backLabel="Back to log in" />
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-akoma-ink">Set a new password</h1>
        </div>
        <Card>
          {status === "checking" && <p className="text-center text-sm text-akoma-ink/60">Checking your reset link…</p>}

          {status === "invalid" && (
            <div className="text-center">
              <p className="text-sm text-akoma-ink">
                This reset link is invalid or has expired.
              </p>
              <Link href="/forgot-password" className="mt-3 inline-block text-sm font-medium text-akoma-green hover:underline">
                Request a new one
              </Link>
            </div>
          )}

          {status === "done" && (
            <p className="text-center text-sm text-akoma-green">Password updated — taking you to your dashboard…</p>
          )}

          {status === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="New password" hint="At least 8 characters">
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirm new password">
                <Input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
              {error && (
                <p role="alert" className="rounded-lg bg-akoma-terracotta/10 px-3 py-2 text-sm text-akoma-terracotta">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={isPending || blocked} className="w-full">
                {isPending ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
}
