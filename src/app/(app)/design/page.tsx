// src/app/(app)/design/page.tsx
//
// Pro design tools: a richer home for generateTimeline() and
// seatingSuggestions() from lib/bisaai.ts (linked here from the BisaAI
// hub instead of duplicated there — see LEARNING.md #19), plus a real,
// non-mock invitation template gallery. Both AI-backed sections render
// on load from GET params (?startTime=, ?tableSize=), each form carries
// a hidden field preserving the other section's current value so
// adjusting one doesn't reset the other.

import { getCurrentWeddingPlan } from "@/lib/session";
import { requirePass } from "@/lib/plan";
import { generateTimeline, seatingSuggestions } from "@/lib/bisaai";
import { Card } from "@/components/ui/Card";
import { MockBadge } from "@/components/ui/Badge";
import { UpgradePrompt } from "@/components/pro/UpgradePrompt";
import { InvitationTemplates } from "@/components/design/InvitationTemplates";

export default async function DesignToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ startTime?: string; tableSize?: string }>;
}) {
  const { startTime: startTimeParam, tableSize: tableSizeParam } = await searchParams;
  const weddingPlan = await getCurrentWeddingPlan();
  const gate = requirePass(weddingPlan!, "Design tools");

  const startTime = startTimeParam ?? "09:00";
  const tableSize = tableSizeParam ? Number(tableSizeParam) : 10;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-akoma-ink">Design Tools</h1>
        <p className="mt-1 text-sm text-akoma-ink/60">Wedding-day timeline, invitation looks, and seating.</p>
      </div>

      {!gate.allowed ? (
        <UpgradePrompt reason={gate.upgradeReason} />
      ) : (
        <>
          <TimelineSection weddingPlanId={weddingPlan!.id} startTime={startTime} tableSize={tableSize} />
          <InvitationSection weddingPlan={weddingPlan!} />
          <SeatingSection weddingPlanId={weddingPlan!.id} tableSize={tableSize} startTime={startTime} />
        </>
      )}
    </div>
  );
}

async function TimelineSection({
  weddingPlanId,
  startTime,
  tableSize,
}: {
  weddingPlanId: string;
  startTime: string;
  tableSize: number;
}) {
  const result = await generateTimeline({ weddingPlanId, startTime });

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-akoma-ink">Wedding day timeline</h2>
        <MockBadge />
      </div>
      <form method="get" className="mb-4 flex items-end gap-3">
        <input type="hidden" name="tableSize" value={tableSize} />
        <div>
          <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Start time</label>
          <input
            type="time"
            name="startTime"
            defaultValue={startTime}
            className="rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
          />
        </div>
        <button type="submit" className="rounded-lg bg-akoma-green px-4 py-2 text-sm font-medium text-white hover:bg-akoma-green/90">
          Update
        </button>
      </form>

      {result.ok && (
        <ol className="relative space-y-4 border-l border-akoma-ink/10 pl-4">
          {result.data.entries.map((entry, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[1.32rem] top-1 h-2 w-2 rounded-full bg-akoma-green" />
              <p className="text-xs font-medium text-akoma-green">{entry.time}</p>
              <p className="text-sm text-akoma-ink">{entry.activity}</p>
              <p className="text-xs text-akoma-ink/40">{entry.durationMinutes} min</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function InvitationSection({
  weddingPlan,
}: {
  weddingPlan: { coupleNames: string; weddingDate: Date; city: string };
}) {
  return (
    <Card>
      <h2 className="mb-3 font-semibold text-akoma-ink">Invitation templates</h2>
      <p className="mb-4 text-sm text-akoma-ink/60">
        Real templates, not AI-generated images — pick a look, then use BisaAI&apos;s email invite draft for the wording.
      </p>
      <InvitationTemplates coupleNames={weddingPlan.coupleNames} weddingDate={weddingPlan.weddingDate} city={weddingPlan.city} />
    </Card>
  );
}

async function SeatingSection({
  weddingPlanId,
  tableSize,
  startTime,
}: {
  weddingPlanId: string;
  tableSize: number;
  startTime: string;
}) {
  const result = await seatingSuggestions({ weddingPlanId, tableSize });

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-akoma-ink">Seating chart</h2>
        <MockBadge />
      </div>
      <form method="get" className="mb-4 flex items-end gap-3">
        <input type="hidden" name="startTime" value={startTime} />
        <div>
          <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Guests per table</label>
          <input
            type="number"
            name="tableSize"
            min={2}
            max={20}
            defaultValue={tableSize}
            className="w-24 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
          />
        </div>
        <button type="submit" className="rounded-lg bg-akoma-green px-4 py-2 text-sm font-medium text-white hover:bg-akoma-green/90">
          Update
        </button>
      </form>

      {result.ok && (
        <>
          {result.data.tables.length === 0 ? (
            <p className="text-sm text-akoma-ink/50">No confirmed (RSVP: Yes) guests yet — seating suggestions need confirmed guests first.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {result.data.tables.map((table) => (
                <div key={table.tableNumber} className="rounded-xl border border-akoma-ink/10 p-3">
                  <p className="mb-1.5 text-sm font-semibold text-akoma-ink">Table {table.tableNumber}</p>
                  <ul className="space-y-0.5 text-xs text-akoma-ink/70">
                    {table.guestNames.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
