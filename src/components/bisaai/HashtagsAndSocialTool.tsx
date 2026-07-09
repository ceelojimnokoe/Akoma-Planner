// src/components/bisaai/HashtagsAndSocialTool.tsx
//
// Two small, related tools (hashtags + a social caption) bundled into one
// card since they're typically used together and each is barely more
// than a button and a text block — separate cards would be mostly
// whitespace.

"use client";

import { useState, useTransition } from "react";
import { runSuggestHashtags, runGenerateSocialPost } from "@/server/actions/bisaai";
import { ToolCard } from "@/components/bisaai/ToolCard";
import { Button } from "@/components/ui/Button";
import { MockBadge } from "@/components/ui/Badge";

export function HashtagsAndSocialTool({ weddingPlanId }: { weddingPlanId: string }) {
  const [hashtags, setHashtags] = useState<string[] | null>(null);
  const [hashtagError, setHashtagError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<"instagram" | "facebook">("instagram");
  const [caption, setCaption] = useState<string | null>(null);
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleHashtags() {
    startTransition(async () => {
      const result = await runSuggestHashtags(weddingPlanId);
      if (result.ok) setHashtags(result.data.hashtags);
      else setHashtagError(result.error);
    });
  }

  function handleCaption() {
    startTransition(async () => {
      const result = await runGenerateSocialPost(weddingPlanId, platform);
      if (result.ok) setCaption(result.data.caption);
      else setCaptionError(result.error);
    });
  }

  return (
    <ToolCard title="Hashtags & social post" description="Wedding hashtag ideas and a ready-to-edit announcement caption.">
      <div className="space-y-4">
        <div>
          <Button size="sm" variant="secondary" disabled={isPending} onClick={handleHashtags}>
            Suggest hashtags
          </Button>
          {hashtags && (
            <div className="mt-2 flex flex-wrap gap-2">
              {hashtags.map((h) => (
                <span key={h} className="rounded-full bg-akoma-ink/5 px-2.5 py-1 text-xs text-akoma-ink/70">
                  {h}
                </span>
              ))}
            </div>
          )}
          {hashtagError && <p className="mt-2 text-sm text-akoma-terracotta">{hashtagError}</p>}
        </div>

        <div className="border-t border-akoma-ink/10 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as typeof platform)}
              className="rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
            >
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
            </select>
            <Button size="sm" variant="secondary" disabled={isPending} onClick={handleCaption}>
              Draft caption
            </Button>
            <MockBadge />
          </div>
          {caption && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-akoma-ink/5 p-3 text-sm text-akoma-ink/70">{caption}</p>}
          {captionError && <p className="mt-2 text-sm text-akoma-terracotta">{captionError}</p>}
        </div>
      </div>
    </ToolCard>
  );
}
