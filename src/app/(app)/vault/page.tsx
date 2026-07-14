// src/app/(app)/vault/page.tsx
//
// Pass tool: secure storage for wedding-related documents (contracts,
// receipts, agreements, invoices, legal documents) — see
// lib/supabase/storage.ts for why this uses Supabase Storage rather than
// local disk.

import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { requirePass } from "@/lib/plan";
import { Card } from "@/components/ui/Card";
import { UpgradePrompt } from "@/components/upgrade/UpgradePrompt";
import { UploadDocumentForm } from "@/components/vault/UploadDocumentForm";
import { DocumentList } from "@/components/vault/DocumentList";

export default async function VaultPage() {
  const weddingPlan = await getCurrentWeddingPlan();
  const gate = requirePass(weddingPlan!, "Wedding Vault");

  const documents = gate.allowed
    ? await prisma.weddingDocument.findMany({ where: { weddingPlanId: weddingPlan!.id }, orderBy: { createdAt: "desc" } })
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-akoma-ink">Wedding Vault</h1>
        <p className="mt-1 text-sm text-akoma-ink/60">
          A secure place for vendor contracts, receipts, agreements, invoices, and other important documents.
        </p>
      </div>

      {!gate.allowed ? (
        <UpgradePrompt reason={gate.upgradeReason} />
      ) : (
        <>
          <Card>
            <UploadDocumentForm />
          </Card>

          <Card>
            <DocumentList
              documents={documents.map((d) => ({ id: d.id, name: d.name, category: d.category, fileSizeBytes: d.fileSizeBytes }))}
            />
          </Card>
        </>
      )}
    </div>
  );
}
