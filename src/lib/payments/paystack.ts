// src/lib/payments/paystack.ts
//
// Thin wrapper around Paystack's REST API — plain fetch, no SDK, matching
// this project's "no unnecessary dependencies" pattern (see zod, pdf-lib,
// read-excel-file — all chosen the same way). Card and mobile money (MTN
// MoMo, Telecel, AT) are both offered automatically for a GHS transaction
// with channels: ["card", "mobile_money"] — no separate Hubtel
// integration needed for either rail.
//
// PAYSTACK_SECRET_KEY is read ONLY in this file and the webhook route
// (app/api/webhooks/paystack/route.ts) — never in a Client Component,
// never sent to the browser. Grep for PAYSTACK_SECRET_KEY outside these
// two files to confirm that stays true after any future change here.

import { createHmac, timingSafeEqual } from "crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

/** True once a real secret key is configured — the seam callers use to
 *  choose between the real Paystack flow and the honest local-dev stub
 *  (see server/actions/billing.ts and checkout/page.tsx). */
export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

interface InitializeTransactionInput {
  email: string;
  amountPesewas: number;
  reference: string;
  callbackUrl: string;
}

interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

/** Starts a Paystack transaction and returns the URL to redirect the
 *  browser to. Never trust anything about "did this succeed" from this
 *  call alone — that's what verifyTransaction() and the webhook are for. */
export async function initializeTransaction(
  input: InitializeTransactionInput
): Promise<InitializeTransactionResult> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountPesewas,
      currency: "GHS",
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: ["card", "mobile_money"],
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message ?? "Paystack initialize failed");
  }

  return {
    authorizationUrl: json.data.authorization_url,
    accessCode: json.data.access_code,
    reference: json.data.reference,
  };
}

export type PaystackTransactionStatus = "success" | "failed" | "abandoned";

interface VerifyTransactionResult {
  status: PaystackTransactionStatus;
  amountPesewas: number;
  currency: string;
  reference: string;
}

/** Server-side verification of a transaction's real status — the only
 *  thing ever trusted to say "payment succeeded." Called from both the
 *  webhook route (the actual source of truth) and the checkout callback
 *  page (a faster UI convenience) — never from a client-side redirect
 *  alone. See LEARNING.md #27's original statement of this rule. */
export async function verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${getSecretKey()}` },
  });

  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message ?? "Paystack verify failed");
  }

  return {
    status: json.data.status,
    amountPesewas: json.data.amount,
    currency: json.data.currency,
    reference: json.data.reference,
  };
}

/** Verifies the `x-paystack-signature` header on an incoming webhook
 *  request: HMAC-SHA512 of the raw request body, keyed with the secret
 *  key. Must run against the RAW body text before any JSON parsing —
 *  see the webhook route, which reads request.text() first for exactly
 *  this reason (parsing then re-stringifying can change byte-for-byte
 *  formatting and silently break the signature check). */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha512", getSecretKey()).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);
  // timingSafeEqual throws on a length mismatch rather than returning
  // false — guard first so a malformed header can't crash the request.
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
