// src/app/(app)/bisaai/page.tsx
//
// BisaAI hub: free Q&A chat plus every Pro tool as a visible card. Free
// users see every tool card (visibly-present-but-gated) — clicking
// "Generate" on a Pro tool surfaces the upgrade message inline via the
// server action's own requirePro() check, so there's no separate gating
// branch needed in this page itself.

import { getCurrentWeddingPlan } from "@/lib/session";
import { ChatPanel } from "@/components/bisaai/ChatPanel";
import { ShoppingListTool } from "@/components/bisaai/ShoppingListTool";
import { DecorMoodboardTool } from "@/components/bisaai/DecorMoodboardTool";
import { HoneymoonTool } from "@/components/bisaai/HoneymoonTool";
import { HashtagsAndSocialTool } from "@/components/bisaai/HashtagsAndSocialTool";
import { EmailInviteTool } from "@/components/bisaai/EmailInviteTool";
import { ToolLinkCard } from "@/components/bisaai/ToolLinkCard";

export default async function BisaAIPage() {
  const weddingPlan = await getCurrentWeddingPlan();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-akoma-ink">BisaAI</h1>
        <p className="mt-1 text-sm text-akoma-ink/60">
          Basic Q&amp;A is free. Everything below is a Pro tool — visible either way, unlocked on Pro.
        </p>
      </div>

      <ChatPanel weddingPlanId={weddingPlan!.id} />

      <div>
        <h2 className="mb-3 font-semibold text-akoma-ink">Pro tools</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ShoppingListTool weddingPlanId={weddingPlan!.id} />
          <DecorMoodboardTool weddingPlanId={weddingPlan!.id} />
          <HoneymoonTool weddingPlanId={weddingPlan!.id} />
          <HashtagsAndSocialTool weddingPlanId={weddingPlan!.id} />
          <EmailInviteTool weddingPlanId={weddingPlan!.id} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-akoma-ink">More BisaAI tools, with their own screens</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ToolLinkCard
            title="Vendor sourcing"
            description="BisaAI-ranked vendor recommendations from the local database, by category and city."
            href="/vendors"
          />
          <ToolLinkCard
            title="Traditional list pricing"
            description="Estimated costs for drinks, kente, and customary gifts, by market."
            href="/traditional-list"
          />
          <ToolLinkCard
            title="Dress try-on (experimental)"
            description="An approximate, consent-gated preview — not accurate, not for purchase decisions."
            href="/dress-tryon"
          />
          <ToolLinkCard
            title="Timeline & seating"
            description="Minute-by-minute day-of schedule and table seating suggestions."
            href="/design"
          />
        </div>
      </div>
    </div>
  );
}
