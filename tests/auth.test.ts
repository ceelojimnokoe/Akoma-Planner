// tests/auth.test.ts
//
// Same pattern as budget.test.ts: pure functions, no database. Covers the
// one piece of the new account layer that's genuinely worth a regression
// test — password hashing/verification round-tripping correctly, and
// never two identical hashes for the same password (the random salt).

import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth";

describe("hashPassword / verifyPassword", () => {
  it("verifies the correct password against its own hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  it("never stores the password in plaintext", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct horse battery staple");
  });

  it("salts each hash uniquely, even for the same password", async () => {
    const hashA = await hashPassword("same password");
    const hashB = await hashPassword("same password");
    expect(hashA).not.toBe(hashB);
    expect(await verifyPassword("same password", hashA)).toBe(true);
    expect(await verifyPassword("same password", hashB)).toBe(true);
  });

  it("returns false instead of throwing on a malformed stored hash", async () => {
    expect(await verifyPassword("anything", "not-a-real-hash")).toBe(false);
  });
});
