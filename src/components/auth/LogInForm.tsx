// src/components/auth/LogInForm.tsx

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { logIn, type AuthResult } from "@/server/actions/auth";
import type { LogInInput } from "@/lib/validation/auth";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";

const emptyForm: LogInInput = { email: "", password: "" };

export function LogInForm() {
  const [form, setForm] = useState(emptyForm);
  const [result, setResult] = useState<AuthResult<LogInInput> | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof LogInInput>(key: K, value: LogInInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const response = await logIn(form);
      // On success the action redirects server-side; only failures reach here.
      setResult(response);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Email" error={result?.fieldErrors?.email}>
        <Input
          type="email"
          required
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />
      </Field>
      <Field label="Password" error={result?.fieldErrors?.password}>
        <Input type="password" required value={form.password} onChange={(e) => update("password", e.target.value)} />
      </Field>

      {result?.error && (
        <p className="rounded-lg bg-akoma-terracotta/10 px-3 py-2 text-sm text-akoma-terracotta">{result.error}</p>
      )}

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-akoma-ink/60 hover:underline">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Logging in…" : "Log in"}
      </Button>

      <div className="flex items-center gap-3 text-xs text-akoma-ink/40">
        <div className="h-px flex-1 bg-akoma-ink/10" />
        or
        <div className="h-px flex-1 bg-akoma-ink/10" />
      </div>

      <SocialLoginButtons />

      <p className="text-center text-sm text-akoma-ink/60">
        New to AkomaPlanner?{" "}
        <Link href="/signup" className="font-medium text-akoma-green hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
