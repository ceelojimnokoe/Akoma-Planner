// middleware.ts
//
// Root Next.js middleware — the first (and only) auth gate every request
// passes through. All the actual logic lives in
// src/lib/supabase/middleware.ts's updateSession(); this file is just the
// required entry point + the route matcher telling Next.js which requests
// to run it on.

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets and image files — nothing there needs a session
    // check or a cookie refresh, and running middleware on them is pure
    // overhead.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
