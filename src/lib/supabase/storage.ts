// src/lib/supabase/storage.ts
//
// A service-role Supabase client scoped ONLY to Storage operations. This
// app uses Supabase for auth alone — the real business data (WeddingPlan,
// WeddingDocument, etc.) lives in SQLite via Prisma, entirely invisible
// to Supabase — so Storage RLS policies have no way to express "only
// this wedding's members may touch this file." Authorization happens the
// same way it does everywhere else in this app: a Prisma-backed
// requirePass() + ownership check in application code, with this
// privileged client only ever invoked *after* that check passes.
// Callable ONLY from the route handlers under src/app/api/upload/document
// and src/app/api/documents, and from server/actions/documents.ts —
// never from anything that skips that check first. Mirrors
// lib/supabase/admin.ts's own restriction, just for Storage instead of
// Auth Admin operations.
//
// Bucket setup (one-time, in the Supabase dashboard's Storage tab): create
// a bucket named exactly WEDDING_DOCUMENTS_BUCKET below. No bucket
// policies are needed — the service role key bypasses Storage RLS the
// same way it bypasses Postgres RLS.

import { createClient } from "@supabase/supabase-js";

export const WEDDING_DOCUMENTS_BUCKET = "wedding-documents";

export function createSupabaseStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
