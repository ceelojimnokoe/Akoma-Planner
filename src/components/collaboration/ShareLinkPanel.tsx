// src/components/collaboration/ShareLinkPanel.tsx
//
// The public read-only wedding page link. Regenerating invalidates the
// old URL immediately (anyone with the old link loses access) — worth a
// confirm() since it's the one action here with an irreversible side
// effect for whoever you'd already shared the old link with.

"use client";

import { useState, useTransition } from "react";
import { regenerateShareToken } from "@/server/actions/collaboration";
import { Button } from "@/components/ui/Button";

export function ShareLinkPanel({ weddingPlanId, shareUrl }: { weddingPlanId: string; shareUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleRegenerate() {
    if (!confirm("Regenerate the share link? The current link will stop working immediately.")) return;
    startTransition(async () => {
      await regenerateShareToken(weddingPlanId);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-akoma-ink/15 bg-akoma-ink/5 px-3 py-2">
        <code className="flex-1 truncate text-sm text-akoma-ink/70">{shareUrl}</code>
        <Button size="sm" variant="ghost" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      <Button size="sm" variant="ghost" disabled={isPending} onClick={handleRegenerate}>
        {isPending ? "Regenerating…" : "Regenerate link"}
      </Button>
      <p className="text-xs text-akoma-ink/40">
        Anyone with this link can view a read-only summary of your wedding — no budget, guest list, or vendor details
        are shown.
      </p>
    </div>
  );
}
