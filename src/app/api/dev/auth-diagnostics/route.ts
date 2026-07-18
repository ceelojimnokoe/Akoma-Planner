// src/app/api/dev/auth-diagnostics/route.ts
//
// Development-only diagnostic for the exact failure chain a broken login
// can hide in: Supabase auth succeeding while the local profile sync
// fails silently underneath it (the confirmed cause of one production
// incident already — see server/actions/auth.ts's logIn()). Runs each
// stage independently and reports which one first failed, rather than
// bailing out at the first problem — the whole point is to see past a
// single generic error message.
//
// Hard-blocked outside development — this deliberately reveals whether
// a session/profile/plan exist for the CALLER's own cookies, which is
// exactly the kind of thing that must never be reachable in production,
// admin guard or not (this app has no admin-role concept to gate it
// with, so "not available at all" is the only safe option — matching
// the task's own "unavailable in production, or require an explicit
// server-only admin guard" — no such guard exists here, so unavailable).
// Never returns a token, key, password, cookie value, or another user's
// data — only booleans/counts about the CALLER's own session.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

interface StageResult {
  ok: boolean;
  detail?: string;
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }

  const stages: Record<string, StageResult> = {};
  let failedStage: string | null = null;

  function record(name: string, result: StageResult) {
    stages[name] = result;
    if (!result.ok && !failedStage) failedStage = name;
  }

  // Stage 1: required env vars.
  const requiredEnv = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "DATABASE_URL"];
  const missingEnv = requiredEnv.filter((name) => !process.env[name]);
  record("environmentVariables", missingEnv.length === 0 ? { ok: true } : { ok: false, detail: `Missing: ${missingEnv.join(", ")}` });

  // Stage 2: Supabase server client + session.
  let userId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    record("session", { ok: true, detail: session ? "present" : "no active session (not signed in)" });

    // Only worth asking Supabase to re-validate a user when a session
    // actually exists — getUser() with none returns an "Auth session
    // missing!" error, which is the normal, expected shape of "you're
    // not signed in," not a failure worth flagging as one.
    if (session) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        record("supabaseUser", { ok: false, detail: userError.message });
      } else {
        userId = user?.id ?? null;
        record("supabaseUser", { ok: true, detail: user ? "present" : "session existed but no user came back" });
      }
    } else {
      record("supabaseUser", { ok: true, detail: "not signed in" });
    }
  } catch (err) {
    record("session", { ok: false, detail: err instanceof Error ? err.message : "Failed to create Supabase client" });
  }

  // Stage 3: database reachability — independent of auth, so a DB outage
  // is distinguishable from "you're just not signed in".
  try {
    await prisma.user.count();
    record("databaseReachable", { ok: true });
  } catch (err) {
    record("databaseReachable", { ok: false, detail: err instanceof Error ? err.message : "Unknown database error" });
  }

  // Stage 4 + 5: local profile and plan — only meaningful if signed in
  // AND the database is reachable; skipped (not failed) otherwise.
  if (userId && stages.databaseReachable?.ok) {
    try {
      const localUser = await prisma.user.findUnique({ where: { supabaseId: userId } });
      record("localProfile", { ok: true, detail: localUser ? "present" : "MISSING — syncLocalUser() would create it on next login" });

      if (localUser) {
        const weddingPlan = await prisma.weddingPlan.findFirst({ where: { ownerUserId: localUser.id } });
        record("accountPlan", {
          ok: true,
          detail: weddingPlan ? `hasWeddingPass: ${weddingPlan.hasWeddingPass}` : "no wedding plan yet (would redirect to /onboarding)",
        });
      }
    } catch (err) {
      record("localProfile", { ok: false, detail: err instanceof Error ? err.message : "Unknown error reading local profile" });
    }
  }

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    failedStage,
    stages,
  });
}
