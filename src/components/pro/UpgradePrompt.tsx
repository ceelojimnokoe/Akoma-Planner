// src/components/pro/UpgradePrompt.tsx
//
// The standard "this is a Pro feature" block. Used whenever a page or
// panel hits a requirePro() gate from lib/plan.ts — same visual treatment
// everywhere so a Free user always recognizes it instantly.

import { LinkButton } from "@/components/ui/Button";
import { ProBadge } from "@/components/ui/Badge";

export function UpgradePrompt({ reason }: { reason: string }) {
  return (
    <div className="rounded-xl border border-akoma-gold/30 bg-akoma-gold/5 p-6 text-center">
      <ProBadge className="mb-3" />
      <p className="text-sm text-akoma-ink/80">{reason}</p>
      <LinkButton href="/pricing" variant="secondary" size="sm" className="mt-4">
        Upgrade to Pro
      </LinkButton>
    </div>
  );
}
