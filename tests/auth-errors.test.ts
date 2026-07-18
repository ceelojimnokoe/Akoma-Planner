// tests/auth-errors.test.ts
//
// formatAuthError() is the one place every auth form's error message
// comes from — these cases are drawn directly from the real failure
// reports this file was written to fix: a raw rate-limit message
// leaking to the browser, and an error value that isn't a proper
// AuthError at all (null/undefined/a bare object) rendering as literal
// "null"/"undefined"/"[object Object]" instead of a message.

import { describe, expect, it } from "vitest";
import { formatAuthError, formatUnexpectedAuthError } from "@/lib/auth-errors";

describe("formatAuthError", () => {
  it("never shows a raw rate-limit message (by HTTP status)", () => {
    const message = formatAuthError({ message: "Email rate limit exceeded", status: 429, name: "AuthApiError" });
    expect(message).not.toMatch(/rate limit exceeded/i);
    expect(message).toContain("Too many verification emails");
  });

  it("never shows a raw rate-limit message (by Supabase error code, no status)", () => {
    const message = formatAuthError({ message: "over_email_send_rate_limit", code: "over_email_send_rate_limit" });
    expect(message).toContain("Too many verification emails");
  });

  it("catches a rate-limit message even without a recognized status or code", () => {
    const message = formatAuthError({ message: "Request rate limit reached for this email address" });
    expect(message).toContain("Too many verification emails");
  });

  it("gives a friendly message for an already-registered email", () => {
    const message = formatAuthError({ message: "User already registered", code: "user_already_exists" });
    expect(message.toLowerCase()).toContain("already registered");
  });

  it("gives a friendly message for an unconfirmed email", () => {
    const message = formatAuthError({ message: "Email not confirmed", code: "email_not_confirmed" });
    expect(message.toLowerCase()).toContain("confirm your email");
  });

  it("gives the same generic message for invalid credentials, regardless of which part was wrong", () => {
    const message = formatAuthError({ message: "Invalid login credentials", code: "invalid_credentials", status: 400 });
    expect(message).toBe("That email and password don't match.");
  });

  it("passes through a real, safe Supabase message it hasn't special-cased", () => {
    const message = formatAuthError({ message: "Password should be at least 6 characters.", status: 422 });
    expect(message).toContain("Password should be at least 6 characters");
  });

  // --- The exact failure class this file exists to prevent ---

  it("never returns the literal string for a null error", () => {
    const message = formatAuthError(null);
    expect(message).not.toBe("null");
    expect(message.length).toBeGreaterThan(0);
  });

  it("never returns the literal string for an undefined error", () => {
    const message = formatAuthError(undefined);
    expect(message).not.toBe("undefined");
    expect(message.length).toBeGreaterThan(0);
  });

  it("never returns '[object Object]' for a bare, message-less object", () => {
    const message = formatAuthError({ status: 500 });
    expect(message).not.toContain("[object Object]");
    expect(message.length).toBeGreaterThan(0);
  });

  it("falls back to the generic message when the AuthError's own message is literally the string 'null'", () => {
    const message = formatAuthError({ message: "null" });
    expect(message).not.toBe("null");
  });

  it("falls back to the generic message for an empty message", () => {
    const message = formatAuthError({ message: "" });
    expect(message.length).toBeGreaterThan(0);
  });

  it("never returns empty/null-like text even for an input shape it wasn't designed for", () => {
    // formatAuthError() is for the `{ data, error }` shape a Supabase
    // auth call itself returns — a raw JS Error is out of contract for
    // it (that's what formatUnexpectedAuthError() + a try/catch is for,
    // e.g. around syncLocalUser()). This just proves it degrades safely
    // — some non-empty string, never a crash — rather than assuming it
    // will never be called with anything else.
    const message = formatAuthError(new TypeError("Cannot read properties of undefined (reading 'foo')"));
    expect(message.length).toBeGreaterThan(0);
  });
});

describe("formatUnexpectedAuthError", () => {
  it("always returns the same safe, non-empty message", () => {
    const message = formatUnexpectedAuthError();
    expect(message.length).toBeGreaterThan(0);
    expect(message).not.toBe("null");
    expect(message).not.toContain("[object Object]");
  });
});
