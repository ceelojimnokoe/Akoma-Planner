// tests/paystack.test.ts
//
// verifyWebhookSignature() is the one piece of Workstream C genuinely
// testable without a live Paystack account: it's pure HMAC verification,
// and this test controls both sides (the "secret key" and the payload),
// the same way Paystack and this app would in production. Everything
// else in lib/payments/paystack.ts calls Paystack's real API and can
// only be exercised end-to-end with real test-mode credentials.

import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "@/lib/payments/paystack";

const TEST_SECRET = "sk_test_fake_secret_for_unit_tests";

describe("verifyWebhookSignature", () => {
  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.PAYSTACK_SECRET_KEY;
  });

  function sign(body: string): string {
    return createHmac("sha512", TEST_SECRET).update(body).digest("hex");
  }

  it("accepts a signature computed with the correct secret", () => {
    const body = JSON.stringify({ event: "charge.success", data: { reference: "pass_abc_123" } });
    expect(verifyWebhookSignature(body, sign(body))).toBe(true);
  });

  it("rejects a signature computed with the wrong secret", () => {
    const body = JSON.stringify({ event: "charge.success", data: { reference: "pass_abc_123" } });
    const wrongSignature = createHmac("sha512", "not_the_real_secret").update(body).digest("hex");
    expect(verifyWebhookSignature(body, wrongSignature)).toBe(false);
  });

  it("rejects a valid signature paired with a tampered body", () => {
    const originalBody = JSON.stringify({ event: "charge.success", data: { reference: "pass_abc_123" } });
    const signature = sign(originalBody);
    const tamperedBody = JSON.stringify({ event: "charge.success", data: { reference: "pass_someone_elses_id" } });
    expect(verifyWebhookSignature(tamperedBody, signature)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    const body = JSON.stringify({ event: "charge.success" });
    expect(verifyWebhookSignature(body, null)).toBe(false);
  });

  it("does not throw on a signature of a different length than expected", () => {
    const body = JSON.stringify({ event: "charge.success" });
    expect(() => verifyWebhookSignature(body, "short")).not.toThrow();
    expect(verifyWebhookSignature(body, "short")).toBe(false);
  });
});
