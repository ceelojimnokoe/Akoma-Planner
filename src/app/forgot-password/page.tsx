// src/app/forgot-password/page.tsx
//
// Sends a real Supabase password-reset email (requestPasswordReset()) —
// used to be UI-only with no backend call at all. Still shows the same
// generic "if an account exists..." confirmation regardless of outcome,
// preserved from the old placeholder's own stated reasoning: never
// reveal whether a given email is a real account.

"use client";

import { useState, useTransition } from "react";
import { requestPasswordReset } from "@/server/actions/auth";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { guard, blocked } = useSubmitGuard();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() =>
      guard(async () => {
        // requestPasswordReset() always resolves { ok: true } — logging
        // any real failure server-side instead of surfacing it here —
        // since revealing a failure would itself leak whether the email
        // exists. See that action's own comment.
        await requestPasswordReset(email);
        setSubmitted(true);
      })
    );
  }

  return (
    <div className="min-h-screen bg-akoma-cream">
      <PublicHeader backHref="/login" backLabel="Back to log in" />
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-akoma-ink">Reset your password</h1>
        </div>
        <Card>
          {submitted ? (
            <p className="text-center text-sm text-akoma-ink">
              If an account exists for <span className="font-medium">{email}</span>, we&apos;ve sent a reset link.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="Email">
                <Input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </Field>
              <Button type="submit" disabled={isPending || blocked} className="w-full">
                {isPending ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
}
