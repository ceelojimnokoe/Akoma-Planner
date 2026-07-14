// src/app/api/documents/[documentId]/signed-url/route.ts
//
// Generates a short-lived signed URL on demand rather than exposing a
// permanent public URL — appropriate for documents that can be sensitive
// (contracts, receipts), unlike the avatar route's durable public path.

import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { requirePass } from "@/lib/plan";
import { createSupabaseStorageClient, WEDDING_DOCUMENTS_BUCKET } from "@/lib/supabase/storage";

const SIGNED_URL_TTL_SECONDS = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const weddingPlan = await getCurrentWeddingPlan();
  if (!weddingPlan) return Response.json({ ok: false, error: "No wedding plan found." }, { status: 404 });

  const gate = requirePass(weddingPlan, "Wedding Vault");
  if (!gate.allowed) return Response.json({ ok: false, error: gate.upgradeReason }, { status: 403 });

  const document = await prisma.weddingDocument.findUnique({ where: { id: documentId } });
  if (!document || document.weddingPlanId !== weddingPlan.id) {
    return Response.json({ ok: false, error: "Document not found." }, { status: 404 });
  }

  const supabase = createSupabaseStorageClient();
  if (!supabase) return Response.json({ ok: false, error: "Storage isn't configured." }, { status: 500 });

  const { data, error } = await supabase.storage.from(WEDDING_DOCUMENTS_BUCKET).createSignedUrl(document.storagePath, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    return Response.json({ ok: false, error: error?.message ?? "Could not create a signed URL." }, { status: 500 });
  }

  return Response.json({ ok: true, url: data.signedUrl });
}
