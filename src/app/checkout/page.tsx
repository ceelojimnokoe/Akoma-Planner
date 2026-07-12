// src/app/checkout/page.tsx
//
// Real checkout when PAYSTACK_SECRET_KEY is configured (see
// server/actions/billing.ts's startPayment() and
// lib/payments/paystack.ts) — redirects to Paystack's own hosted payment
// page, card and mobile money both offered. No payment fields live here
// at all — no card number field, no mobile money number field, nothing
// resembling a real payment form anywhere in this codebase (safe rule
// #4) — that's Paystack's job, on Paystack's own page.
//
// Without a configured key (local dev without real credentials), falls
// back to the honest, clearly-labelled demo stub instead of breaking —
// see unlockWeddingPassDevOnly()'s own comment for why that path is
// additionally gated off in production.

import { redirect } from "next/navigation";
import { getCurrentWeddingPlan, requireSession } from "@/lib/session";
import { WEDDING_PASS_AMOUNT_GHS } from "@/lib/pricing";
import { formatGHS } from "@/lib/currency";
import { isPaystackConfigured } from "@/lib/payments/paystack";
import { startPayment, unlockWeddingPassDevOnly } from "@/server/actions/billing";
import { Card } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSession();
  const { error } = await searchParams;
  const weddingPlan = await getCurrentWeddingPlan();
  if (!weddingPlan) redirect("/onboarding");

  if (weddingPlan.hasWeddingPass) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-akoma-cream px-6">
        <Card className="max-w-sm text-center">
          <p className="font-medium text-akoma-ink">You already have the Wedding Pass 🎉</p>
          <LinkButton href="/dashboard" className="mt-4 w-full justify-center">
            Go to dashboard
          </LinkButton>
        </Card>
      </div>
    );
  }

  const paystackReady = isPaystackConfigured();
  const confirmAction = paystackReady
    ? startPayment.bind(null, weddingPlan.id)
    : unlockWeddingPassDevOnly.bind(null, weddingPlan.id);

  return (
    <div className="flex min-h-screen items-center justify-center bg-akoma-cream px-6 py-16">
      <Card className="w-full max-w-md">
        <h1 className="text-xl font-bold text-akoma-ink">Get the Wedding Pass</h1>
        <p className="mt-1 text-sm text-akoma-ink/60">Pay once. Yours through the wedding and after.</p>
        <div className="mt-4 flex items-center justify-between rounded-lg bg-akoma-ink/5 px-4 py-3">
          <span className="text-sm text-akoma-ink/70">Wedding Pass</span>
          <span className="font-semibold text-akoma-ink">
            {formatGHS(WEDDING_PASS_AMOUNT_GHS)} <span className="text-xs font-normal text-akoma-ink/50">one-time</span>
          </span>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-akoma-terracotta/10 px-3 py-2 text-sm text-akoma-terracotta">
            We couldn&apos;t start the payment just now. Nothing was charged — please try again in a moment.
          </p>
        )}

        {paystackReady ? (
          <p className="mt-4 rounded-lg border border-akoma-ink/10 bg-akoma-ink/5 px-4 py-3 text-xs text-akoma-ink/60">
            You&apos;ll be taken to Paystack&apos;s secure payment page — card or mobile money (MTN MoMo, Telecel,
            AT). Nothing you enter there is seen or stored by AkomaPlanner.
          </p>
        ) : (
          <div className="mt-4 rounded-lg border border-akoma-gold/30 bg-akoma-gold/5 px-4 py-3 text-xs text-akoma-ink/70">
            This is a demo checkout — Paystack isn&apos;t configured, so no real payment is collected, processed, or
            stored. Set <code>PAYSTACK_SECRET_KEY</code> (see <code>.env.example</code>) to enable the real flow.
          </div>
        )}

        <form action={confirmAction} className="mt-5">
          <Button type="submit" className="w-full">
            {paystackReady ? "Continue to payment" : "Simulate successful payment"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
