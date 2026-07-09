// src/app/checkout/page.tsx
//
// STUBBED CHECKOUT — see the header comment in
// src/server/actions/billing.ts for the safety rule this implements
// (safe rule #4: no sensitive payment data collected or stored). There
// is genuinely no payment form here — no card fields, no mobile money
// number field — just a plain confirm button and an honest explanation
// of what a real integration would replace it with.
//
// This page also demonstrates a pattern not used elsewhere in the app:
// binding arguments to a Server Action with .bind() and using it
// directly as a <form action={...}>, with zero client-side JavaScript.
// Every other mutation in this project goes through a Client Component
// calling the action via useTransition (for pending/error UI) — this
// page doesn't need any of that, since a stub with one button and a
// server-side redirect has no client state worth managing.

import { redirect } from "next/navigation";
import { getCurrentWeddingPlan } from "@/lib/session";
import { PRICING, isBillingInterval, type BillingInterval } from "@/lib/pricing";
import { formatGHS } from "@/lib/currency";
import { upgradeToPro } from "@/server/actions/billing";
import { Card } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ interval?: string }>;
}) {
  const { interval: intervalParam } = await searchParams;
  const interval: BillingInterval = intervalParam && isBillingInterval(intervalParam) ? intervalParam : "monthly";
  const price = PRICING[interval];

  const weddingPlan = await getCurrentWeddingPlan();
  if (!weddingPlan) redirect("/onboarding");

  if (weddingPlan.plan === "PRO") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-akoma-cream px-6">
        <Card className="max-w-sm text-center">
          <p className="font-medium text-akoma-ink">You&apos;re already on AkomaPlanner Pro 🎉</p>
          <LinkButton href="/dashboard" className="mt-4 w-full justify-center">
            Go to dashboard
          </LinkButton>
        </Card>
      </div>
    );
  }

  const confirmUpgrade = upgradeToPro.bind(null, weddingPlan.id, interval);

  return (
    <div className="flex min-h-screen items-center justify-center bg-akoma-cream px-6 py-16">
      <Card className="w-full max-w-md">
        <h1 className="text-xl font-bold text-akoma-ink">Upgrade to AkomaPlanner Pro</h1>
        <div className="mt-4 flex items-center justify-between rounded-lg bg-akoma-ink/5 px-4 py-3">
          <span className="text-sm text-akoma-ink/70">{price.label}</span>
          <span className="font-semibold text-akoma-ink">
            {formatGHS(price.amountGHS)} <span className="text-xs font-normal text-akoma-ink/50">{price.suffix}</span>
          </span>
        </div>

        <div className="mt-4 rounded-lg border border-akoma-gold/30 bg-akoma-gold/5 px-4 py-3 text-xs text-akoma-ink/70">
          This is a demo checkout — no real payment is collected, processed, or stored. In production this step
          would hand off to Paystack or Hubtel Mobile Money (Ghana), configured via the <code>PAYSTACK_SECRET_KEY</code> /{" "}
          <code>HUBTEL_CLIENT_ID</code> environment variables (see <code>.env.example</code>), with the plan only
          upgraded after a verified webhook confirms payment — not, as here, immediately on click.
        </div>

        <form action={confirmUpgrade} className="mt-5">
          <Button type="submit" className="w-full">
            Simulate successful payment
          </Button>
        </form>
      </Card>
    </div>
  );
}
