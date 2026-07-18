// scripts/setup-test-users.ts
//
// Repairs (or creates, if missing) exactly two test accounts:
//   - free@test.com  — Free plan
//   - the dev-only Wedding Pass test account exported as
//     TEST_PASS_USER_EMAIL from src/lib/session.ts ("pass@test.com" in
//     this codebase today; read from TEST_PAID_USER_PASSWORD below to
//     match the naming this script's own operator docs use)
//
// Why this exists rather than reusing prisma/seed.ts: that script's
// main() unconditionally calls clearExistingData() first — it wipes
// every User/WeddingPlan/Guest/... row before reseeding. Fine for a
// disposable local dev database, never safe to run against anything
// that might hold real data. This script is the opposite on purpose:
// narrowly scoped to the two emails above, safe to re-run any number of
// times, and never touches any other row in either Supabase Auth or
// the local database.
//
// Run with: npm run setup:test-users
// (never wired into postinstall/build/deploy — see package.json)
//
// Required env vars (server-only — this script refuses to run without
// all of them):
//   NEXT_PUBLIC_SUPABASE_URL       — which Supabase project to target
//   SUPABASE_SERVICE_ROLE_KEY      — Admin API access; NEVER exposed to
//                                    the browser, NEVER given a
//                                    NEXT_PUBLIC_ prefix
//   DATABASE_URL                   — the local app database Prisma writes to
//   TEST_FREE_USER_PASSWORD        — new/reset password for free@test.com
//   TEST_PAID_USER_PASSWORD        — new/reset password for the Pass test account
//
// Passwords are read from env at runtime only — never logged, never
// written to a file, never present in source control (.env is
// gitignored; .env.example ships only blank placeholders for these two).

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { FREE_TEST_USER_EMAIL, TEST_PASS_USER_EMAIL } from "../src/lib/session";
import { WEDDING_PASS_AMOUNT_GHS } from "../src/lib/pricing";

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "TEST_FREE_USER_PASSWORD",
  "TEST_PAID_USER_PASSWORD",
] as const;

function requireEnv(): Record<(typeof REQUIRED_ENV)[number], string> {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(
      `setup-test-users: refusing to run — missing required environment variable(s): ${missing.join(", ")}.\n` +
        "Set these in your local .env (never commit real values) before running `npm run setup:test-users`."
    );
    process.exit(1);
  }
  return Object.fromEntries(REQUIRED_ENV.map((name) => [name, process.env[name] as string])) as Record<
    (typeof REQUIRED_ENV)[number],
    string
  >;
}

/** A few characters of the Supabase project ref — enough to visually
 *  confirm which project this is about to touch without printing the
 *  full URL (harmless either way, kept short for a cleaner banner). */
function projectHint(url: string): string {
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return url;
  }
}

async function warnAndPause(supabaseUrl: string): Promise<void> {
  const isLikelyLocal = supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1");
  console.log("");
  console.log("=".repeat(70));
  console.log(`  setup-test-users: about to create/repair test accounts on:`);
  console.log(`    ${supabaseUrl}  (project: ${projectHint(supabaseUrl)})`);
  if (!isLikelyLocal) {
    console.log("");
    console.log("  This does NOT look like a local Supabase instance. If this is a");
    console.log("  shared staging or production project, make sure that's really");
    console.log("  what you intend — this will create or update real Auth users:");
    console.log(`    - ${FREE_TEST_USER_EMAIL}`);
    console.log(`    - ${TEST_PASS_USER_EMAIL}`);
  }
  console.log("  Only these two emails are ever touched. Ctrl+C now to cancel.");
  console.log("=".repeat(70));
  console.log("");
  await new Promise((resolve) => setTimeout(resolve, 3000));
}

async function getOrCreateAuthUser(
  admin: ReturnType<typeof createClient>["auth"]["admin"],
  email: string,
  password: string,
  name: string
): Promise<string> {
  const { data: listed, error: listError } = await admin.listUsers();
  if (listError) throw new Error(`Couldn't list Supabase users: ${listError.message}`);

  const existing = listed.users.find((u) => u.email === email);
  if (existing) {
    const { error: updateError } = await admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (updateError) throw new Error(`Couldn't update ${email}: ${updateError.message}`);
    console.log(`  updated existing Supabase Auth user for ${email} (password reset, email re-confirmed)`);
    return existing.id;
  }

  const { data: created, error: createError } = await admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (createError || !created.user) {
    throw new Error(`Couldn't create ${email}: ${createError?.message ?? "unknown error"}`);
  }
  console.log(`  created new Supabase Auth user for ${email}`);
  return created.user.id;
}

async function main() {
  const env = requireEnv();
  await warnAndPause(env.NEXT_PUBLIC_SUPABASE_URL);

  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  }).auth.admin;

  const prisma = new PrismaClient();

  try {
    await repairTestAccount(prisma, admin, {
      email: FREE_TEST_USER_EMAIL,
      password: env.TEST_FREE_USER_PASSWORD,
      name: "Free Test Account",
      hasWeddingPass: false,
      city: "ACCRA",
      tradition: "Ga",
    });

    await repairTestAccount(prisma, admin, {
      email: TEST_PASS_USER_EMAIL,
      password: env.TEST_PAID_USER_PASSWORD,
      name: "Pass Test Account",
      hasWeddingPass: true,
      city: "KUMASI",
      tradition: "Ashanti",
    });

    console.log("\nsetup-test-users: done.");
  } finally {
    await prisma.$disconnect();
  }
}

async function repairTestAccount(
  prisma: PrismaClient,
  admin: ReturnType<typeof createClient>["auth"]["admin"],
  opts: { email: string; password: string; name: string; hasWeddingPass: boolean; city: "ACCRA" | "KUMASI"; tradition: string }
) {
  const { email, password, name, hasWeddingPass, city, tradition } = opts;
  console.log(`\n${email}:`);

  const supabaseId = await getOrCreateAuthUser(admin, email, password, name);

  // Same claim-by-email-then-create order as lib/supabase/sync-user.ts,
  // so this script can never end up with two local rows for one email.
  let user = await prisma.user.findUnique({ where: { supabaseId } });
  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    user = byEmail
      ? await prisma.user.update({ where: { id: byEmail.id }, data: { supabaseId, emailVerified: true } })
      : await prisma.user.create({
          data: { supabaseId, email, name, authProvider: "email", emailVerified: true },
        });
    console.log(`  ${byEmail ? "linked existing" : "created"} local User row`);
  } else {
    console.log("  local User row already present");
  }

  let weddingPlan = await prisma.weddingPlan.findFirst({ where: { ownerUserId: user.id } });
  if (!weddingPlan) {
    const weddingDate = new Date();
    weddingDate.setMonth(weddingDate.getMonth() + 6);
    weddingPlan = await prisma.weddingPlan.create({
      data: {
        coupleNames: name,
        weddingDate,
        totalBudgetGHS: 100_000,
        city,
        guestEstimate: 150,
        tradition,
        hasWeddingPass,
        ownerUserId: user.id,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });
    console.log(`  created WeddingPlan (hasWeddingPass: ${hasWeddingPass})`);

    if (hasWeddingPass) {
      await prisma.payment.create({
        data: {
          weddingPlanId: weddingPlan.id,
          provider: "dev-seed",
          reference: `dev-seed-test-account-${weddingPlan.id}`,
          amountGHS: WEDDING_PASS_AMOUNT_GHS,
          status: "SUCCESS",
        },
      });
      console.log("  recorded a dev-seed SUCCESS Payment row (matches Settings' 'active since' display)");
    }
  } else if (weddingPlan.hasWeddingPass !== hasWeddingPass) {
    await prisma.weddingPlan.update({ where: { id: weddingPlan.id }, data: { hasWeddingPass } });
    console.log(`  corrected hasWeddingPass to ${hasWeddingPass} on the existing WeddingPlan`);
  } else {
    console.log(`  existing WeddingPlan already has hasWeddingPass: ${hasWeddingPass} — left untouched`);
  }
}

main().catch((err) => {
  console.error("setup-test-users: failed —", err instanceof Error ? err.message : err);
  process.exit(1);
});
