// src/app/api/webhooks/paystack/route.ts
//
// The real source of truth for "did this Wedding Pass payment succeed."
// Paystack calls this after every transaction event; only a verified
// charge.success event ever grants access, via confirmPaymentSuccess()
// (see server/actions/billing.ts) — never the client-side checkout
// redirect alone (see checkout/callback/page.tsx's own comment on why it
// isn't trusted either, despite calling the same function). Must read
// the RAW body — not request.json() — since signature verification needs
// the exact bytes Paystack signed, before any parsing.
//
// Always returns 200 once the signature check passes, even for events we
// don't act on, so Paystack doesn't keep retrying a webhook we've
// already handled. Safe to receive the same event more than once:
// confirmPaymentSuccess() is idempotent on Payment.reference.

import { revalidatePath } from "next/cache";
import { verifyWebhookSignature } from "@/lib/payments/paystack";
import { confirmPaymentSuccess } from "@/server/actions/billing";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (event.event === "charge.success" && event.data?.reference) {
    await confirmPaymentSuccess(event.data.reference);
    // Safe here (a Route Handler, not a render) — see confirmPaymentSuccess's
    // own comment on why it doesn't call this itself. Matters most for this
    // path specifically: the webhook can arrive while the browser is sitting
    // on an already-open, already-rendered tab, unlike the checkout callback
    // page's own always-fresh next navigation.
    revalidatePath("/", "layout");
  }

  return Response.json({ received: true });
}
