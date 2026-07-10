// src/app/forgot-password/page.tsx
//
// Placeholder: UI only, no email is sent and no backend call is made — see
// LEARNING.md. Submitting always shows the same static confirmation,
// deliberately not revealing whether the email is a real account (the one
// real security-relevant behavior a genuine version would need anyway).

"use client";

import { useState } from "react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { MockBadge } from "@/components/ui/Badge";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-akoma-cream">
      <PublicHeader backHref="/login" backLabel="Back to log in" />
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-akoma-ink">Reset your password</h1>
        </div>
        <Card>
          <div className="mb-4 flex justify-center">
            <MockBadge />
          </div>
          {submitted ? (
            <p className="text-center text-sm text-akoma-ink">
              If an account exists for <span className="font-medium">{email}</span>, we&apos;ve sent a reset link.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="space-y-5"
            >
              <Field label="Email">
                <Input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Button type="submit" className="w-full">
                Send reset link
              </Button>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
}
