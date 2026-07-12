// src/lib/session.ts
//
// The current authenticated user, backed by real Supabase Auth — no more
// silent stub-account fallback (the old lib/auth.ts cookie, and the
// "any visitor becomes the demo account" behavior it enabled, are gone).
// middleware.ts (src/lib/supabase/middleware.ts) already redirects an
// unauthenticated visitor away from every protected route before any of
// these functions run there, so getCurrentUser() below can treat "no
// session" as a defensive edge case rather than the expected path — it
// still redirects on its own too (belt-and-suspenders), it just
// shouldn't normally be the one doing that work.

import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { createSupabaseServerClient } from "./supabase/server";
import { syncLocalUser } from "./supabase/sync-user";

// Real, working login credentials for the seeded demo account (try them
// on /login) — prisma/seed.ts uses these to give it a real Supabase
// identity via the Admin API, see that file's own comment.
export const DEMO_USER_EMAIL = "ama.owusu@example.com";
export const DEMO_USER_PASSWORD = "akomaplanner-demo";

/** Like getCurrentUser(), but never redirects — null for an anonymous
 *  visitor. For public pages (the landing page) that render either way
 *  but tailor a CTA to signed-in status. */
export async function getCurrentUserOrNull() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) return null;
  return syncLocalUser(supabaseUser);
}

/**
 * The current signed-in user's local record, synced fresh from their
 * Supabase session (see supabase/sync-user.ts). Assumes a session
 * exists — true for every route middleware.ts protects — and redirects
 * to /login as a defensive fallback if somehow called where it doesn't.
 */
export async function getCurrentUser() {
  const user = await getCurrentUserOrNull();
  if (!user) redirect("/login");
  return user;
}

/** Explicit alias for the couple of routes outside middleware's
 *  page-redirect matcher that still want a named hard gate (the PDF
 *  export API routes) — identical behavior to getCurrentUser(), named
 *  for what it's asserting at the call site. */
export async function requireSession() {
  return getCurrentUser();
}

/**
 * The current user's primary wedding plan (the one they own). Most MVP
 * pages only ever need this. "First owned plan" is a safe simplification
 * while the Free plan is capped at one wedding (see lib/plan.ts) — once
 * Collaboration ships, a Wedding Pass user picking between multiple weddings gets a
 * real picker instead of this shortcut.
 */
export async function getCurrentWeddingPlan() {
  const user = await getCurrentUser();
  return prisma.weddingPlan.findFirst({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "asc" },
  });
}
