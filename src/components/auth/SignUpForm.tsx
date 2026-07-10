// src/components/auth/SignUpForm.tsx

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signUp, type AuthResult } from "@/server/actions/auth";
import type { SignUpInput } from "@/lib/validation/auth";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";

const emptyForm: SignUpInput = { name: "", email: "", password: "", confirmPassword: "" };

export function SignUpForm() {
  const [form, setForm] = useState(emptyForm);
  const [result, setResult] = useState<AuthResult<SignUpInput> | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof SignUpInput>(key: K, value: SignUpInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const response = await signUp(form);
      // On success the action redirects server-side; only failures reach here.
      setResult(response);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Full name" error={result?.fieldErrors?.name}>
        <Input required placeholder="Ama Owusu" value={form.name} onChange={(e) => update("name", e.target.value)} />
      </Field>
      <Field label="Email" error={result?.fieldErrors?.email}>
        <Input
          type="email"
          required
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />
      </Field>
      <Field label="Password" error={result?.fieldErrors?.password} hint="At least 8 characters">
        <Input
          type="password"
          required
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
        />
      </Field>
      <Field label="Confirm password" error={result?.fieldErrors?.confirmPassword}>
        <Input
          type="password"
          required
          value={form.confirmPassword}
          onChange={(e) => update("confirmPassword", e.target.value)}
        />
      </Field>

      {result?.error && !result.fieldErrors && (
        <p className="rounded-lg bg-akoma-terracotta/10 px-3 py-2 text-sm text-akoma-terracotta">{result.error}</p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Creating your account…" : "Create account"}
      </Button>

      <div className="flex items-center gap-3 text-xs text-akoma-ink/40">
        <div className="h-px flex-1 bg-akoma-ink/10" />
        or
        <div className="h-px flex-1 bg-akoma-ink/10" />
      </div>

      <SocialLoginButtons />

      <p className="text-center text-sm text-akoma-ink/60">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-akoma-green hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
