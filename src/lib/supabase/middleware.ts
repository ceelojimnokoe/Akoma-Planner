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
const PROTECTED_PREFIXES = [
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
const AUTH_ONLY_PREFIXES = ["/login", "/signup"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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
