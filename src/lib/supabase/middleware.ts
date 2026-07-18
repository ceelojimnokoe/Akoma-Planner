// src/lib/supabase/middleware.ts
//
// The one real, centralized route gate — replaces the old scattered,
// partially-broken per-page checks (getCurrentUser() used to silently
// fall back to a stub account instead of ever blocking anyone). Runs on
// every request (see root middleware.ts): refreshes the Supabase session
// cookie (the one thing only middleware/Route Handlers can actually
// write — see lib/supabase/server.ts's own comment on why Server
// Components can't), then redirects unauthenticated visitors away from
// protected pages and authenticated visitors away from /login /signup.
//
// IMPORTANT (Supabase's own warning, kept verbatim): don't add logic
// between createServerClient() and supabase.auth.getUser() below — doing
// so risks users being randomly signed out in ways that are very hard to
// debug.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Everything that requires a signed-in visitor. Prefix match (via
// startsWith below), so nested routes (e.g. /vendors/[vendorId]) are
// covered by their parent's entry without listing every dynamic segment.
// Exported (along with AUTH_ONLY_PREFIXES/matchesPrefix below) purely so
// tests/middleware-routes.test.ts can verify route classification
// without spinning up a real Next.js request/response — no behavior
// change from being exported.
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/budget",
  "/checklist",
  "/guests",
  "/vendors",
  "/bisaai",
  "/calendar",
  "/accommodation",
  "/traditional-list",
  "/dress-tryon",
  "/collaboration",
  "/design",
  "/profile",
  "/settings",
  "/checkout",
  "/onboarding",
  "/verify-email",
];

// Pages that only make sense for a signed-out visitor — an already
// authenticated user hitting these gets sent straight to their dashboard
// instead of seeing a login form for an account they're already in.
export const AUTH_ONLY_PREFIXES = ["/login", "/signup"];

export function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Runs on every request, so a missing env var here means every page
  // 500s with no clue why — @supabase/ssr's own error ("Your project's
  // URL and Key are required...") gives no indication these are just
  // unset, not wrong. Fail fast with the actual variable names so this
  // is diagnosable straight from the deployment logs.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [!supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL", !supabaseAnonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY"]
      .filter(Boolean)
      .join(", ");
    throw new Error(
      `Missing required environment variable(s): ${missing}. ` +
        "Set these in your deployment platform's project settings (e.g. Vercel → Settings → Environment Variables, " +
        "enabled for the Production environment) and redeploy — NEXT_PUBLIC_* variables are inlined at build time."
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && matchesPrefix(pathname, AUTH_ONLY_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
