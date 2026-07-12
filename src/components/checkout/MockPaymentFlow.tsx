// src/components/checkout/MockPaymentFlow.tsx
//
// The demo-checkout experience — only ever rendered when
// isPaystackConfigured() is false (see checkout/page.tsx). Three states
// (idle -> processing -> success) instead of the old instant
// form-action redirect, so clicking "pay" gives real feedback rather
// than teleporting straight to the dashboard. This is purely a pacing/
// reveal animation around a real database write (simulatePaymentDevOnly
// really does set hasWeddingPass — nothing here is faked data, only the
// couple-of-seconds "processing" delay is theatrical).
//
// This is the seam a real client-driven Paystack flow (e.g. their inline
// Popup SDK, as an alternative to the redirect-based Standard flow
// startPayment() already implements) would replace: swap the
// simulatePaymentDevOnly() call below for a real Paystack Popup
// invocation, keep the same processing/success state machine around it.

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { simulatePaymentDevOnly } from "@/server/actions/billing";
import { Button } from "@/components/ui/Button";

type FlowState = "idle" | "processing" | "success" | "error";

const PROCESSING_MS = 2000;
const SUCCESS_PAUSE_MS = 1600;

export function MockPaymentFlow({ weddingPlanId }: { weddingPlanId: string }) {
  const [state, setState] = useState<FlowState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handlePay() {
    setState("processing");
    setError(null);

    startTransition(async () => {
      const [result] = await Promise.all([
        simulatePaymentDevOnly(weddingPlanId),
        // Minimum processing time so this never feels instant/fake, even
        // though the real DB write usually finishes in milliseconds.
        new Promise((resolve) => setTimeout(resolve, PROCESSING_MS)),
      ]);

      if (!result.ok) {
        setError(result.error);
        setState("error");
        return;
      }
      setState("success");
    });
  }

  useEffect(() => {
    if (state !== "success") return;
    const timer = setTimeout(() => {
      router.push("/dashboard?unlocked=1");
    }, SUCCESS_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [state, router]);

  if (state === "success") {
    return (
      <div className="mt-5 flex flex-col items-center rounded-lg bg-akoma-green/10 px-4 py-8 text-center">
        <p className="text-3xl">🎉</p>
        <p className="mt-3 font-semibold text-akoma-ink">Welcome to Akoma Planner Pass!</p>
        <p className="mt-1 text-sm text-akoma-ink/70">Your premium features are now unlocked.</p>
        <p className="mt-4 text-xs text-akoma-ink/40">Taking you to your dashboard…</p>
      </div>
    );
  }

  if (state === "processing") {
    return (
      <div className="mt-5 flex flex-col items-center rounded-lg bg-akoma-ink/5 px-4 py-8 text-center">
        <span
          aria-hidden
          className="h-8 w-8 animate-spin rounded-full border-2 border-akoma-ink/15 border-t-akoma-green"
        />
        <p className="mt-3 text-sm font-medium text-akoma-ink">Processing payment…</p>
        <p className="mt-1 text-xs text-akoma-ink/50">This will just take a moment.</p>
      </div>
    );
  }

  return (
    <div className="mt-5">
      {error && (
        <p className="mb-3 rounded-lg bg-akoma-terracotta/10 px-3 py-2 text-sm text-akoma-terracotta">{error}</p>
      )}
      <Button type="button" className="w-full" disabled={isPending} onClick={handlePay}>
        Simulate successful payment
      </Button>
    </div>
  );
}
