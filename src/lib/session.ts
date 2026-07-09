// src/lib/session.ts
//
// STUBBED AUTH. There is no login screen in this MVP — see LEARNING.md #5
// for why. getCurrentUser() always returns the same seeded row. The point
// of routing every "who's using the app right now" lookup through this one
// function is that swapping in real auth later (NextAuth/Auth.js, etc.)
// means rewriting the body of these two functions only — every page and
// server action that calls getCurrentUser()/getCurrentWeddingPlan() keeps
// working unchanged.

import { prisma } from "./prisma";

// Must match the user created in prisma/seed.ts.
export const STUB_USER_EMAIL = "ama.owusu@example.com";

export async function getCurrentUser() {
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
