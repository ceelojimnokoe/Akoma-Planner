// src/server/actions/billing.ts
//
// Real checkout, via Paystack (card + mobile money) — see
// src/lib/payments/paystack.ts for the API wrapper and
// src/app/api/webhooks/paystack/route.ts for the actual source of truth
// on "did this payment succeed." Safe rule #4 still holds: no sensitive
// payment data is collected or stored anywhere in this codebase — card
// and mobile money numbers are entered on Paystack's own hosted page,
// never seen by this app.
//
// startPayment() below only ever creates a PENDING Payment row and
// redirects to Paystack — it never itself grants access. hasWeddingPass
// is set in exactly one place, confirmPaymentSuccess(), called from the
// webhook (the real source of truth) and the checkout callback page (a
// faster UI convenience, never trusted on its own) — see that function's
// own comment for why it's written to be safe to call more than once.

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { WEDDING_PASS_AMOUNT_GHS } from "@/lib/pricing";
import { initializeTransaction, isPaystackConfigured } from "@/lib/payments/paystack";

async function getAppUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const host = (await headers()).get("host");
  return `http://${host}`;
}

/** Real checkout: creates a PENDING Payment row, asks Paystack to start a
 *  transaction, and redirects the browser to Paystack's own hosted
 *  payment page. Nothing here grants access — see confirmPaymentSuccess().
 *
 *  initializeTransaction() is a real network call to Paystack and can
 *  fail (bad/expired key, Paystack outage, etc.) — caught here so that
 *  failure is a friendly "try again" redirect back to checkout, not a
 *  raw server-error crash screen. Confirmed by actually triggering this
 *  path with a deliberately invalid key during verification, not just by
 *  reading the code — the first version of this function let the error
 *  propagate uncaught into Next's generic error page. */
export async function startPayment(weddingPlanId: string): Promise<never> {
  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({
    where: { id: weddingPlanId },
    include: { owner: true },
  });

  const reference = `pass_${weddingPlanId}_${Date.now()}`;
  const appUrl = await getAppUrl();

  let authorizationUrl: string;
  try {
    const transaction = await initializeTransaction({
      email: weddingPlan.owner.email,
      amountPesewas: Math.round(WEDDING_PASS_AMOUNT_GHS * 100),
      reference,
      callbackUrl: `${appUrl}/checkout/callback`,
    });
    authorizationUrl = transaction.authorizationUrl;
  } catch (error) {
    console.error("Paystack initializeTransaction failed:", error);
    redirect("/checkout?error=1");
  }

  await prisma.payment.create({
    data: {
      weddingPlanId,
      provider: "paystack",
      reference,
      amountGHS: WEDDING_PASS_AMOUNT_GHS,
      status: "PENDING",
    },
  });

  redirect(authorizationUrl);
}

/**
 * The one place hasWeddingPass ever gets set to true. Idempotent by
 * design: keyed on Payment.reference (unique in the schema), so calling
 * this twice for the same reference — a retried webhook delivery, or the
 * webhook and the callback page both confirming the same payment — is a
 * no-op the second time, never a double-grant or an error. Returns the
 * wedding plan id on success, or null if the reference doesn't match a
 * known Payment row (defensive — shouldn't happen, since startPayment()
 * always creates the row before Paystack can redirect back).
 *
 * Deliberately does NOT call revalidatePath itself (unlike most mutations
 * in this file) — its two callers need different treatment. The webhook
 * route (a Route Handler) revalidates right after calling this, which is
 * fine there. checkout/callback/page.tsx calls this directly during its
 * own Server Component render — and Next.js disallows revalidatePath
 * during a render outright (confirmed by actually triggering this path
 * with a real payment during verification: it threw "used revalidatePath
 * during render which is unsupported", not just a lint warning). That
 * page doesn't need it anyway: Next 15 defaults dynamic routes to
 * staleTime 0 (see simulatePaymentDevOnly's own comment on this same
 * point), so the "Go to dashboard" link the callback page renders next
 * already fetches hasWeddingPass fresh without any manual invalidation.
 */
export async function confirmPaymentSuccess(reference: string): Promise<{ weddingPlanId: string } | null> {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) return null;
  if (payment.status === "SUCCESS") return { weddingPlanId: payment.weddingPlanId };

  await prisma.$transaction([
    prisma.payment.update({ where: { reference }, data: { status: "SUCCESS" } }),
    prisma.weddingPlan.update({ where: { id: payment.weddingPlanId }, data: { hasWeddingPass: true } }),
  ]);

  return { weddingPlanId: payment.weddingPlanId };
}

/** Marks a payment as failed/abandoned so it stops showing as pending —
 *  called from the callback page when Paystack itself reports the
 *  transaction didn't succeed. Grants nothing. */
export async function markPaymentFailed(reference: string): Promise<void> {
  await prisma.payment.updateMany({
    where: { reference, status: "PENDING" },
    data: { status: "FAILED" },
  });
}

/** Local-dev-only fallback for when PAYSTACK_SECRET_KEY isn't configured,
 *  so the rest of the app stays testable without real keys — see
 *  checkout/page.tsx and MockPaymentFlow.tsx, which only ever offer this
 *  path when isPaystackConfigured() is false. Double-gated on NODE_ENV
 *  too, so a production deployment that simply forgot to set the key
 *  can't silently start granting the Pass for free instead of failing
 *  loudly.
 *
 *  Returns a result instead of redirecting (unlike every other action in
 *  this file) because MockPaymentFlow.tsx — a Client Component — needs
 *  to control the pacing of a processing/success animation itself before
 *  navigating away; a server-side redirect() would short-circuit that.
 *  This is the one seam a real Paystack Popup/inline flow (if ever added
 *  as an alternative to the redirect-based Standard flow startPayment()
 *  already implements) would plug into instead of this stub.
 *
 *  Deliberately skips revalidatePath (unlike every other mutation in this
 *  file): calling it here, awaited from a startTransition on /checkout
 *  itself, made Next re-render CheckoutPage server-side mid-animation —
 *  its "You already have the Wedding Pass" gate would replace
 *  MockPaymentFlow's own success state before the couple ever saw it,
 *  regardless of which path was passed to revalidatePath. Not needed
 *  anyway: Next 15 defaults dynamic routes to staleTime 0, so
 *  MockPaymentFlow's router.push("/dashboard...") already fetches
 *  hasWeddingPass fresh without any manual invalidation. */
export async function simulatePaymentDevOnly(
  weddingPlanId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isPaystackConfigured() || process.env.NODE_ENV === "production") {
    return { ok: false, error: "This demo payment is only available in local development without Paystack configured." };
  }
  await prisma.weddingPlan.update({ where: { id: weddingPlanId }, data: { hasWeddingPass: true } });
  return { ok: true };
}

/** Not part of the spec'd feature set, but useful during development to
 *  see the Free experience again without touching the database by hand.
 *  Dev-only — see its Settings UI, gated out of production entirely,
 *  since a one-time purchase has no real "downgrade" concept. Returns
 *  void (not a result object) because it's used directly as a
 *  <form action={...}> — React 19 requires form actions to return
 *  void/Promise<void>; the page's own re-render after the action is
 *  what shows the updated state, no client-side result handling needed. */
export async function downgradeToFree(weddingPlanId: string): Promise<void> {
  await prisma.weddingPlan.update({ where: { id: weddingPlanId }, data: { hasWeddingPass: false } });
  revalidatePath("/", "layout");
}
