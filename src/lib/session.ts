// src/lib/session.ts
//
// Real (but lightweight) auth now exists — see lib/auth.ts — alongside the
// original seeded stub, per LEARNING.md #5's own stated plan. getCurrentUser()
// checks the session cookie first; if there isn't one (or it points at a
// user that no longer exists), it falls back to the same hardcoded seeded
// row as before. That fallback is what keeps the seeded demo account
// working with zero setup — nothing that already calls getCurrentUser()/
// getCurrentWeddingPlan() had to change for this to work.

import { prisma } from "./prisma";
import { getSessionUserId } from "./auth";

// Must match the user created in prisma/seed.ts. Both are also real,
// working login credentials for the seeded demo account — try them on
// /login — since the seeded user now gets a real passwordHash too.
export const STUB_USER_EMAIL = "ama.owusu@example.com";
export const STUB_USER_PASSWORD = "akomaplanner-demo";

export async function getCurrentUser() {
  const sessionUserId = await getSessionUserId();
  if (sessionUserId) {
    const sessionUser = await prisma.user.findUnique({ where: { id: sessionUserId } });
    if (sessionUser) return sessionUser;
  }

  const user = await prisma.user.findUnique({ where: { email: STUB_USER_EMAIL } });
  if (!user) {
    throw new Error(
      `Stub session user not found (${STUB_USER_EMAIL}). Did you run "npm run db:seed"?`
    );
  }
  return user;
}

/**
 * The current user's primary wedding plan (the one they own). Most MVP
 * pages only ever need this. "First owned plan" is a safe simplification
 * while the Free plan is capped at one wedding (see lib/plan.ts) — once
 * Collaboration ships, a Pro user picking between multiple weddings gets a
 * real picker instead of this shortcut.
 */
export async function getCurrentWeddingPlan() {
  const user = await getCurrentUser();
  return prisma.weddingPlan.findFirst({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "asc" },
  });
}
