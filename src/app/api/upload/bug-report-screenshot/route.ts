// src/app/api/upload/bug-report-screenshot/route.ts
//
// Optional screenshot attachment for Settings' "Report a bug" form — a
// route handler (not a Server Action) for the same reason as
// src/app/api/upload/document/route.ts: this is a file upload, not a form
// mutation. Stored in Supabase Storage rather than local disk, same
// reasoning as documents: local disk doesn't reliably persist on
// serverless hosts, and a screenshot can incidentally capture sensitive
// on-screen data, so it goes through the same private-bucket path as the
// Documents Vault rather than a public URL. Returns only the storage
// path — server/actions/bug-reports.ts writes that onto the BugReport row
// once the rest of the form is submitted; this route never touches the
// database itself.
//
// Any signed-in user may call this (no requirePass gate, unlike document
// uploads) — reporting a bug isn't a Wedding Pass feature.

import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/session";
import { createSupabaseStorageClient, BUG_REPORT_SCREENSHOTS_BUCKET } from "@/lib/supabase/storage";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  const user = await getCurrentUser();

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "No file provided." }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return Response.json({ ok: false, error: "Please upload a JPG, PNG, WEBP, or GIF image." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return Response.json({ ok: false, error: "Image must be under 5MB." }, { status: 400 });
  }

  const supabase = createSupabaseStorageClient();
  if (!supabase) {
    return Response.json(
      { ok: false, error: "Screenshot storage isn't configured yet — you can still submit the report without one." },
      { status: 500 }
    );
  }

  const storagePath = `${user.id}/${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUG_REPORT_SCREENSHOTS_BUCKET)
    .upload(storagePath, bytes, { contentType: file.type });
  if (uploadError) {
    return Response.json({ ok: false, error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  return Response.json({ ok: true, storagePath });
}
