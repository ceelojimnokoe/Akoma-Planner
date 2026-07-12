// src/app/checkout/callback/page.tsx
//
// Where Paystack redirects the browser after a checkout attempt (see
// startPayment()'s callbackUrl). This page calls verifyTransaction()
// server-side and, only if Paystack itself confirms success, calls the
// same confirmPaymentSuccess() the webhook uses — a faster path to a
// "you're in" screen than waiting for the webhook to arrive. It is NOT
// the source of truth: the webhook is, and grants access on its own
// regardless of whether the browser ever comes back to this page at all
// (closed tab, network drop after paying, etc.) — see that route's
// comment. This page and the webhook call the exact same idempotent
// function, so whichever gets there first does the real work and the
// other is a safe no-op.

import { requireSession } from "@/lib/session";
import { verifyTransaction } from "@/lib/payments/paystack";
import { confirmPaymentSuccess, markPaymentFailed } from "@/server/actions/billing";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

export default async function CheckoutCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  await requireSession();
  const { reference } = await searchParams;

  if (!reference) {
    return (
      <CallbackShell
        title="Something went wrong"
        body="No payment reference was provided."
        action={{ href: "/checkout", label: "Back to checkout" }}
      />
    );
  }

  const transaction = await verifyTransaction(reference).catch(() => null);

  if (!transaction || transaction.status !== "success") {
    await markPaymentFailed(reference);
    return (
      <CallbackShell
        title="Payment not completed"
        body="Paystack reported this payment didn't go through. No charge was made — you can try again."
        action={{ href: "/checkout", label: "Try again" }}
      />
    );
  }

  await confirmPaymentSuccess(reference);

  return (
    <CallbackShell
      title="You're in — Wedding Pass unlocked 🎉"
      body="Payment confirmed. Every Pass feature is unlocked now."
      action={{ href: "/dashboard", label: "Go to dashboard" }}
    />
  );
}

function CallbackShell({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-akoma-cream px-6">
      <Card className="w-full max-w-sm text-center">
        <p className="font-medium text-akoma-ink">{title}</p>
        <p className="mt-2 text-sm text-akoma-ink/60">{body}</p>
        <LinkButton href={action.href} className="mt-4 w-full justify-center">
          {action.label}
        </LinkButton>
      </Card>
    </div>
  );
}
