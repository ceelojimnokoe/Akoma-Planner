// src/lib/supabase/client.ts
//
// The browser-side Supabase client — used from Client Components for
// anything that must originate in the browser itself, most importantly
// signInWithOAuth() (it performs a real window navigation to Google, which
// only makes sense client-side). Everything else (sign-up, login, sign-out)
// goes through Server Actions using lib/supabase/server.ts instead, so the
// session cookie stays httpOnly end-to-end wherever possible.

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
