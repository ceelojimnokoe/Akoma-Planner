// src/lib/supabase/admin.ts
//
// A service-role Supabase client for trusted, server-only, no-user-request
// contexts — currently just prisma/seed.ts, which needs the Admin API
// (auth.admin.createUser / listUsers) to give the seeded demo account a
// real Supabase identity. Deliberately separate from lib/supabase/server.ts
// (which is cookie-based and tied to an incoming request) since a seed
// script has neither a request nor a browser session to read cookies
// from. NEVER import this from anything that runs in response to a user
// request — the service role key bypasses every access control Supabase
// has.

import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
