// tests/middleware-routes.test.ts
//
// Route classification is what decides whether a signed-out visitor gets
// bounced to /login, and whether a signed-in visitor gets bounced away
// from /login — worth testing directly since it's easy to miss a route
// when the list grows, and the auth-flow routes added alongside this
// fix (/auth/confirm, /auth/callback, /reset-password, /forgot-password)
// specifically must NOT be protected (a recovery/confirmation link is
// itself the credential — there's no normal session yet to check).

import { describe, expect, it } from "vitest";
import { AUTH_ONLY_PREFIXES, PROTECTED_PREFIXES, matchesPrefix } from "@/lib/supabase/middleware";

describe("matchesPrefix", () => {
  it("matches an exact path", () => {
    expect(matchesPrefix("/dashboard", ["/dashboard"])).toBe(true);
  });

  it("matches a nested/dynamic path under a protected prefix", () => {
    expect(matchesPrefix("/vendors/abc123", ["/vendors"])).toBe(true);
  });

  it("does not match a different route that merely starts with the same letters", () => {
    // "/vendorsomething" must not be treated as under "/vendors" — the
    // implementation requires either an exact match or a "/" boundary.
    expect(matchesPrefix("/vendorsomething", ["/vendors"])).toBe(false);
  });

  it("does not match an unrelated route", () => {
    expect(matchesPrefix("/pricing", ["/dashboard", "/vendors"])).toBe(false);
  });
});

describe("PROTECTED_PREFIXES", () => {
  it("covers every real signed-in-only route", () => {
    for (const route of [
      "/dashboard",
      "/budget",
      "/checklist",
      "/guests",
      "/vendors",
      "/vendors/some-id",
      "/bisaai",
      "/calendar",
      "/accommodation",
      "/profile",
      "/settings",
      "/checkout",
      "/onboarding",
      "/verify-email",
    ]) {
      expect(matchesPrefix(route, PROTECTED_PREFIXES)).toBe(true);
    }
  });

  it("does NOT protect the public auth routes — a recovery/confirmation link is its own credential", () => {
    for (const route of ["/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback", "/auth/confirm"]) {
      expect(matchesPrefix(route, PROTECTED_PREFIXES)).toBe(false);
    }
  });

  it("does not protect the public marketing routes", () => {
    for (const route of ["/", "/pricing"]) {
      expect(matchesPrefix(route, PROTECTED_PREFIXES)).toBe(false);
    }
  });
});

describe("AUTH_ONLY_PREFIXES", () => {
  it("only covers login and signup", () => {
    expect(matchesPrefix("/login", AUTH_ONLY_PREFIXES)).toBe(true);
    expect(matchesPrefix("/signup", AUTH_ONLY_PREFIXES)).toBe(true);
  });

  it("does not redirect a signed-in visitor away from password reset or confirmation routes", () => {
    // Critical: these must stay reachable even with an active (recovery)
    // session — see reset-password/page.tsx and auth/confirm/route.ts.
    for (const route of ["/forgot-password", "/reset-password", "/auth/callback", "/auth/confirm"]) {
      expect(matchesPrefix(route, AUTH_ONLY_PREFIXES)).toBe(false);
    }
  });
});
