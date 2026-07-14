// src/app/api/upload/document/route.ts
//
// Documents Vault upload — Pass-gated (unlike the avatar route), stores
// the file in Supabase Storage rather than local disk. Local disk very
// likely doesn't persist on Vercel's serverless filesystem, and these
// files (contracts, receipts, legal documents) are exactly the kind of
// thing that can't be allowed to silently vanish. See
// lib/supabase/storage.ts for why a service-role client is needed here.
//
// Same server-generated-filename security convention as
// src/app/api/upload/avatar/route.ts: the client's original filename is
// never used in the storage path, only the MIME-derived extension —
// weddingPlanId and the generated document id are both server/DB-derived,
// never raw client input, so there's no path-traversal surface.

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { requirePass } from "@/lib/plan";
import { createSupabaseStorageClient, WEDDING_DOCUMENTS_BUCKET } from "@/lib/supabase/storage";
import type { DocumentCategory } from "@prisma/client";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const MAX_BYTES = 15 * 1024 * 1024; // 15MB — scanned contracts run larger than a profile photo

const CATEGORIES: DocumentCategory[] = ["VENDORS", "FINANCE", "LEGAL", "GUESTS", "OTHER"];

export async function POST(request: Request) {
  const weddingPlan = await getCurrentWeddingPlan();
  if (!weddingPlan) return Response.json({ ok: false, error: "No wedding plan found." }, { status: 404 });

  const gate = requirePass(weddingPlan, "Wedding Vault");
  if (!gate.allowed) return Response.json({ ok: false, error: gate.upgradeReason }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file");
  const name = formData.get("name");
  const categoryRaw = formData.get("category");

  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "No file provided." }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return Response.json({ ok: false, error: "Please upload a PDF, JPG, PNG, WEBP, DOC, or DOCX file." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return Response.json({ ok: false, error: "File must be under 15MB." }, { status: 400 });
  }

  const category = CATEGORIES.includes(categoryRaw as DocumentCategory) ? (categoryRaw as DocumentCategory) : "OTHER";
  const documentName = typeof name === "string" && name.trim() ? name.trim() : file.name;

  const supabase = createSupabaseStorageClient();
  if (!supabase) {
    return Response.json(
      { ok: false, error: "Storage isn't configured yet — SUPABASE_SERVICE_ROLE_KEY is missing." },
      { status: 500 }
    );
  }

  const id = randomUUID();
  const storagePath = `${weddingPlan.id}/${id}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from(WEDDING_DOCUMENTS_BUCKET).upload(storagePath, bytes, {
    contentType: file.type,
  });
  if (uploadError) {
    return Response.json({ ok: false, error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  await prisma.weddingDocument.create({
    data: {
      id,
      weddingPlanId: weddingPlan.id,
      name: documentName,
      category,
      storagePath,
      fileType: file.type,
      fileSizeBytes: file.size,
    },
  });

  return Response.json({ ok: true });
}
