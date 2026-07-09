// src/server/actions/billing.ts
//
// STUBBED CHECKOUT — safe rule #4: no sensitive payment data is collected
// or stored anywhere in this MVP. There is no card number field, no
// mobile money number field, nothing resembling a real payment form
// anywhere in this codebase. upgradeToPro() below simply flips the
// wedding's plan to PRO the moment the couple confirms — that's the
// entire "checkout."
//
// REAL INTEGRATION TODO: replace the body of upgradeToPro() with a
// redirect to a real Paystack or Hubtel Mobile Money checkout session
// (created server-side using PAYSTACK_SECRET_KEY / HUBTEL_CLIENT_ID from
// .env — see .env.example), and only flip `plan` to PRO from a webhook
// handler that verifies the payment actually succeeded, not from a
// client-triggered action like this one. A real integration must not
// trust the browser to say "payment succeeded."

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isBillingInterval } from "@/lib/pricing";

export async function upgradeToPro(weddingPlanId: string, billingInterval: string): Promise<never> {
  if (!isBillingInterval(billingInterval)) throw new Error("Invalid billing interval");

  await prisma.weddingPlan.update({ where: { id: weddingPlanId }, data: { plan: "PRO" } });

  revalidatePath("/", "layout");
  redirect("/dashboard?upgraded=1");
}

/** Not part of the spec'd feature set, but a real product needs a way to
 *  cancel — and for this MVP it doubles as the easiest way to see the
 *  Free-plan experience again without touching the database by hand.
 *  Returns void (not a result object) because it's used directly as a
 *  <form action={...}> — React 19 requires form actions to return
 *  void/Promise<void>; the page's own re-render after the action is
 *  what shows the updated plan, no client-side result handling needed. */
export async function downgradeToFree(weddingPlanId: string): Promise<void> {
  await prisma.weddingPlan.update({ where: { id: weddingPlanId }, data: { plan: "FREE" } });
  revalidatePath("/", "layout");
}
