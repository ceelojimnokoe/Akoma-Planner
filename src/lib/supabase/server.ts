// src/lib/supabase/server.ts
//
// The server-side Supabase client for Server Components, Server Actions,
// and Route Handlers — reads/writes the session cookie via next/headers.
// Follows Supabase's own documented cookie-adapter pattern exactly (not
// reinvented): Server Components can only *read* cookies, never set them,
// so setAll()'s write attempt is wrapped in a try/catch there — harmless
// when it's a no-op, because middleware.ts refreshes the session cookie
// on every request regardless, which is what actually keeps a Server
// Component's session fresh across requests.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render, where cookies can't be
          // written — safe to ignore since middleware.ts's session refresh
          // is what actually keeps the cookie current.
        }
      },
    },
  });
}
