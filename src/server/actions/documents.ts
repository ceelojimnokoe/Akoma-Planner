// src/server/actions/documents.ts
//
// Delete for the Documents Vault. Upload/download stay route handlers
// (see src/app/api/upload/document, src/app/api/documents — file
// operations, not form mutations) but delete is a plain state change, so
// it's a Server Action like everywhere else in this app.

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePass } from "@/lib/plan";
import { createSupabaseStorageClient, WEDDING_DOCUMENTS_BUCKET } from "@/lib/supabase/storage";

export async function deleteDocument(id: string): Promise<{ ok: boolean; error?: string }> {
  const document = await prisma.weddingDocument.findUniqueOrThrow({ where: { id } });
  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: document.weddingPlanId } });
  const gate = requirePass(weddingPlan, "Wedding Vault");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  const supabase = createSupabaseStorageClient();
  // Best-effort cleanup, same convention as the avatar route's own old-file
  // removal — never block the DB row's deletion on this.
  if (supabase) await supabase.storage.from(WEDDING_DOCUMENTS_BUCKET).remove([document.storagePath]);

  await prisma.weddingDocument.delete({ where: { id } });

  revalidatePath("/vault");
  return { ok: true };
}
