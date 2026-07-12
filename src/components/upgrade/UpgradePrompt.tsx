// src/components/upgrade/UpgradePrompt.tsx
//
// The standard "this needs the Wedding Pass" block. Used whenever a page
// or panel hits a requirePass() gate from lib/plan.ts — same visual
// treatment everywhere so a Free user always recognizes it instantly.

import { LinkButton } from "@/components/ui/Button";
import { PassBadge } from "@/components/ui/Badge";
import { WEDDING_PASS_AMOUNT_GHS } from "@/lib/pricing";
import { formatGHS } from "@/lib/currency";

export function UpgradePrompt({ reason }: { reason: string }) {
  return (
    <div className="rounded-xl border border-akoma-gold/30 bg-akoma-gold/5 p-6 text-center">
      <PassBadge className="mb-3" />
      <p className="text-sm text-akoma-ink/80">{reason}</p>
      <LinkButton href="/pricing" variant="secondary" size="sm" className="mt-4">
        Unlock with the Wedding Pass — {formatGHS(WEDDING_PASS_AMOUNT_GHS)} once
      </LinkButton>
    </div>
  );
}
