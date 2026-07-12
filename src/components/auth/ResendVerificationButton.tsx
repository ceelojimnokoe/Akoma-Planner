// src/components/auth/ResendVerificationButton.tsx
//
// The interactive part of /verify-email — a Client Component since it
// needs pending/result state around resendVerificationEmail(), unlike a
// plain redirecting Server Action form.

"use client";

import { useState, useTransition } from "react";
import { resendVerificationEmail } from "@/server/actions/auth";
import { Button } from "@/components/ui/Button";

export function ResendVerificationButton({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      setResult(await resendVerificationEmail(email));
    });
  }

  return (
    <div className="mt-4">
      <Button type="button" onClick={handleClick} disabled={isPending} className="w-full">
        {isPending ? "Sending…" : "Resend confirmation email"}
      </Button>
      {result?.ok && <p className="mt-2 text-sm text-akoma-green">Sent — check your inbox.</p>}
      {result?.error && <p className="mt-2 text-sm text-akoma-terracotta">{result.error}</p>}
    </div>
  );
}
