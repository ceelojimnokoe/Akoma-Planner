// src/app/(app)/collaboration/page.tsx
//
// Pro tool: manage who else can see this wedding plan, and the public
// read-only share link. See MemberList/ShareLinkPanel and
// server/actions/collaboration.ts for the actual logic.

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { requirePro } from "@/lib/plan";
import { Card } from "@/components/ui/Card";
import { UpgradePrompt } from "@/components/pro/UpgradePrompt";
import { MemberList } from "@/components/collaboration/MemberList";
import { ShareLinkPanel } from "@/components/collaboration/ShareLinkPanel";

export default async function CollaborationPage() {
  const weddingPlan = await getCurrentWeddingPlan();
  const gate = requirePro(weddingPlan!.plan, "Collaboration");

  const members = gate.allowed
    ? await prisma.weddingMember.findMany({
        where: { weddingPlanId: weddingPlan!.id },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const host = (await headers()).get("host");
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? `http://${host}`}/w/${weddingPlan!.shareToken}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-akoma-ink">Collaboration</h1>
        <p className="mt-1 text-sm text-akoma-ink/60">Bring in your fiancé(e) or planner, and share a public summary.</p>
      </div>

      {!gate.allowed ? (
        <UpgradePrompt reason={gate.upgradeReason} />
      ) : (
        <>
          <Card>
            <h2 className="mb-3 font-semibold text-akoma-ink">Wedding members</h2>
            <MemberList weddingPlanId={weddingPlan!.id} members={members} />
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-akoma-ink">Public read-only page</h2>
            <ShareLinkPanel weddingPlanId={weddingPlan!.id} shareUrl={shareUrl} />
          </Card>
        </>
      )}
    </div>
  );
}
