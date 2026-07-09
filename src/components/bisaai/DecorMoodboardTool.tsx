// src/components/bisaai/DecorMoodboardTool.tsx
"use client";

import { useState, useTransition } from "react";
import { runDecorMoodboard } from "@/server/actions/bisaai";
import { ToolCard } from "@/components/bisaai/ToolCard";
import { Button } from "@/components/ui/Button";
import { MockBadge } from "@/components/ui/Badge";

export function DecorMoodboardTool({ weddingPlanId }: { weddingPlanId: string }) {
  const [style, setStyle] = useState("");
  const [palette, setPalette] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof runDecorMoodboard>> | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRun() {
    startTransition(async () => setResult(await runDecorMoodboard(weddingPlanId, style, palette)));
  }

  return (
    <ToolCard title="Decor moodboard" description="A quick style direction to react to — experimental stub, not real generated images.">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Style (e.g. rustic elegant)"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="w-48 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        />
        <input
          type="text"
          placeholder="Colors, comma separated"
          value={palette}
          onChange={(e) => setPalette(e.target.value)}
          className="w-48 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        />
        <Button size="sm" variant="secondary" disabled={isPending} onClick={handleRun}>
          {isPending ? "Generating…" : "Generate moodboard"}
        </Button>
      </div>
      {result?.ok && (
        <div className="mt-3">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-sm text-akoma-ink/70">{result.data.paletteDescription}</p>
            <MockBadge />
          </div>
          <div className="flex gap-2">
            {result.data.moodboardImageUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- local trusted static SVG, not worth the optimizer's SVG restrictions
              <img key={i} src={url} alt="Moodboard placeholder" width={120} height={90} className="rounded-lg border border-akoma-ink/10" />
            ))}
          </div>
        </div>
      )}
      {result && !result.ok && <p className="mt-2 text-sm text-akoma-terracotta">{result.error}</p>}
    </ToolCard>
  );
}
