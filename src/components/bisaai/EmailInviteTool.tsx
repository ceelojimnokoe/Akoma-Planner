// src/components/bisaai/EmailInviteTool.tsx
"use client";

import { useState, useTransition } from "react";
import { runDraftEmailInvite } from "@/server/actions/bisaai";
import { ToolCard } from "@/components/bisaai/ToolCard";
import { Button } from "@/components/ui/Button";
import { MockBadge } from "@/components/ui/Badge";

export function EmailInviteTool({ weddingPlanId }: { weddingPlanId: string }) {
  const [guestName, setGuestName] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof runDraftEmailInvite>> | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRun() {
    startTransition(async () => setResult(await runDraftEmailInvite(weddingPlanId, guestName)));
  }

  return (
    <ToolCard title="Email invite draft" description="A draft you can copy into your own email client — nothing is sent from here.">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Guest name (optional)"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          className="w-48 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        />
        <Button size="sm" variant="secondary" disabled={isPending} onClick={handleRun}>
          {isPending ? "Drafting…" : "Draft invite"}
        </Button>
        <MockBadge />
      </div>
      {result?.ok && (
        <div className="mt-3 rounded-lg bg-akoma-ink/5 p-3">
          <p className="text-sm font-medium text-akoma-ink">{result.data.subject}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-akoma-ink/70">{result.data.body}</p>
        </div>
      )}
      {result && !result.ok && <p className="mt-2 text-sm text-akoma-terracotta">{result.error}</p>}
    </ToolCard>
  );
}
