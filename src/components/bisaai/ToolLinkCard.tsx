// src/components/bisaai/ToolLinkCard.tsx
//
// For BisaAI tools that already have a dedicated full screen elsewhere
// (vendor sourcing lives on /vendors, traditional-list pricing on
// /traditional-list, dress try-on on /dress-tryon, timeline/seating on
// /design) — rather than duplicate that UI here, the BisaAI page just
// links out, so the tool is still visibly listed as a BisaAI capability
// without two copies of the same feature to keep in sync.

import { LinkButton } from "@/components/ui/Button";
import { ProBadge } from "@/components/ui/Badge";

export function ToolLinkCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-akoma-ink/15 p-5">
      <div className="mb-1 flex items-center gap-2">
        <h3 className="font-semibold text-akoma-ink">{title}</h3>
        <ProBadge />
      </div>
      <p className="mb-3 text-sm text-akoma-ink/60">{description}</p>
      <LinkButton href={href} size="sm" variant="ghost">
        Open →
      </LinkButton>
    </div>
  );
}
