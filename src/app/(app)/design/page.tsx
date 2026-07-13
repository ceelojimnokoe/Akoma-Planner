// src/app/(app)/design/page.tsx
//
// Design tools: a persisted, editable wedding-day timeline, a real
// (non-AI) invitation template gallery, and a persisted, interactive
// seating chart. Gated per-section, not whole-page — the invitation
// gallery renders for every account (some templates free, the rest
// locked with PassBadge), while Timeline and Seating each check
// requirePass() independently and show a section-local UpgradePrompt in
// place of just that section when locked. This matches BisaAI's own
// established per-tool gating shape and is a deliberate change from the
// old whole-page requirePass() (which hid the free-usable invitation
// gallery from Free accounts too).

import { getCurrentWeddingPlan } from "@/lib/session";
import { requirePass } from "@/lib/plan";
import { getOrCreateTimeline } from "@/server/actions/timeline";
import { getOrCreateSeatingAssignments } from "@/server/actions/seating";
import { Card } from "@/components/ui/Card";
import { UpgradePrompt } from "@/components/upgrade/UpgradePrompt";
import { InvitationTemplates } from "@/components/design/InvitationTemplates";
import { TimelineSection } from "@/components/design/TimelineSection";
import { SeatingSection } from "@/components/design/SeatingSection";

export default async function DesignToolsPage() {
  const weddingPlan = await getCurrentWeddingPlan();
  const gate = requirePass(weddingPlan!, "The wedding day timeline and seating chart");

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-akoma-ink">Design Tools</h1>
        <p className="mt-1 text-sm text-akoma-ink/60">Wedding-day timeline, invitation looks, and seating.</p>
      </div>

      {gate.allowed ? (
        <TimelineSectionLoader weddingPlanId={weddingPlan!.id} />
      ) : (
        <Card>
          <h2 className="mb-3 font-semibold text-akoma-ink">Wedding day timeline</h2>
          <UpgradePrompt reason={gate.upgradeReason} />
        </Card>
      )}

      <InvitationSection weddingPlan={weddingPlan!} />

      {gate.allowed ? (
        <SeatingSectionLoader weddingPlanId={weddingPlan!.id} />
      ) : (
        <Card>
          <h2 className="mb-3 font-semibold text-akoma-ink">Seating chart</h2>
          <UpgradePrompt reason={gate.upgradeReason} />
        </Card>
      )}
    </div>
  );
}

async function TimelineSectionLoader({ weddingPlanId }: { weddingPlanId: string }) {
  const entries = await getOrCreateTimeline(weddingPlanId);
  return <TimelineSection weddingPlanId={weddingPlanId} entries={entries} />;
}

const DEFAULT_TABLE_SIZE = 10;

async function SeatingSectionLoader({ weddingPlanId }: { weddingPlanId: string }) {
  const guests = await getOrCreateSeatingAssignments(weddingPlanId, DEFAULT_TABLE_SIZE);

  // The "Guests per table" input's starting value should reflect what
  // the last repack actually used, not always reset to the seed default
  // — inferred from the fullest table already on record, since table
  // size itself isn't separately persisted (only the resulting
  // per-guest table numbers are).
  const seatsByTable = new Map<number, number>();
  for (const guest of guests) {
    const table = guest.seatingAssignment?.tableNumber;
    if (table == null) continue;
    seatsByTable.set(table, (seatsByTable.get(table) ?? 0) + (guest.plusOne ? 2 : 1));
  }
  const inferredTableSize = seatsByTable.size > 0 ? Math.max(2, ...seatsByTable.values()) : DEFAULT_TABLE_SIZE;

  return <SeatingSection weddingPlanId={weddingPlanId} guests={guests} tableSize={inferredTableSize} />;
}

function InvitationSection({
  weddingPlan,
}: {
  weddingPlan: {
    id: string;
    coupleNames: string;
    weddingDate: Date;
    city: string;
    hasWeddingPass: boolean;
    selectedInvitationTemplateId: string | null;
  };
}) {
  return (
    <Card>
      <h2 className="mb-3 font-semibold text-akoma-ink">Invitation templates</h2>
      <p className="mb-4 text-sm text-akoma-ink/60">
        Real templates, not AI-generated images — pick a look, then use BisaAI&apos;s email invite draft for the wording.
      </p>
      <InvitationTemplates
        weddingPlanId={weddingPlan.id}
        coupleNames={weddingPlan.coupleNames}
        weddingDate={weddingPlan.weddingDate}
        city={weddingPlan.city}
        hasWeddingPass={weddingPlan.hasWeddingPass}
        selectedTemplateId={weddingPlan.selectedInvitationTemplateId}
      />
    </Card>
  );
}
