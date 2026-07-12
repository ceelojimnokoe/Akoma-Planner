// src/app/auth/callback/route.ts
//
// The redirect target for Google OAuth (see GoogleSignInButton.tsx) —
// exchanges the ?code= Supabase sends back for a real session, syncs the
// local User row, then sends the browser on to /onboarding or
// /dashboard depending on whether they already have a wedding plan. One
// check correctly covers a fresh Google sign-up, a returning Google user
// who never finished onboarding, and a normal returning user — no
// separate "is this their first login" tracking needed. A Route Handler
// (not a Server Component) specifically because only these can actually
// write the session cookie Supabase just issued — see
// lib/supabase/server.ts's own comment on that constraint.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncLocalUser } from "@/lib/supabase/sync-user";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const localUser = await syncLocalUser(data.user);
      const weddingPlan = await prisma.weddingPlan.findFirst({
        where: { ownerUserId: localUser.id },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.redirect(`${origin}${weddingPlan ? "/dashboard" : "/onboarding"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
