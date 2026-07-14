// src/components/honeymoon/HoneymoonPlanForm.tsx
//
// One form covers both first-time setup and later edits — createOrUpdateHoneymoonPlan
// is an upsert, so there's no separate "create" vs "edit" UI state to manage.
// Destination is either a Ghana preset or free text (toggled locally, both
// write to the same one destination field); style is a multi-select via
// checkboxes, joined into HoneymoonPlan.styles' comma-separated string.

"use client";

import { useState, useTransition } from "react";
import { createOrUpdateHoneymoonPlan } from "@/server/actions/honeymoon";
import { HONEYMOON_DESTINATION_PRESETS, HONEYMOON_STYLES } from "@/lib/honeymoon-defaults";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";

export function HoneymoonPlanForm({
  weddingPlanId,
  initialDestination,
  initialStyles,
}: {
  weddingPlanId: string;
  initialDestination: string;
  initialStyles: string[];
}) {
  const isPreset = HONEYMOON_DESTINATION_PRESETS.includes(initialDestination as (typeof HONEYMOON_DESTINATION_PRESETS)[number]);
  const [mode, setMode] = useState<"ghana" | "international">(isPreset || !initialDestination ? "ghana" : "international");
  const [preset, setPreset] = useState(isPreset ? initialDestination : "");
  const [customDestination, setCustomDestination] = useState(isPreset ? "" : initialDestination);
  const [styles, setStyles] = useState<string[]>(initialStyles);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggleStyle(style: string) {
    setStyles((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const destination = mode === "ghana" ? preset : customDestination.trim();
    startTransition(async () => {
      const result = await createOrUpdateHoneymoonPlan({ weddingPlanId, destination, styles });
      if (!result.ok) {
        setError(result.error ?? "Something went wrong");
        return;
      }
      setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Destination</label>
        <div className="mb-2 flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode("ghana")}
            className={`rounded-full border px-3 py-1 ${mode === "ghana" ? "border-akoma-green bg-akoma-green/10 text-akoma-green" : "border-akoma-ink/15 text-akoma-ink/60"}`}
          >
            Ghana
          </button>
          <button
            type="button"
            onClick={() => setMode("international")}
            className={`rounded-full border px-3 py-1 ${mode === "international" ? "border-akoma-green bg-akoma-green/10 text-akoma-green" : "border-akoma-ink/15 text-akoma-ink/60"}`}
          >
            International
          </button>
        </div>
        {mode === "ghana" ? (
          <Select value={preset} onChange={(e) => setPreset(e.target.value)} className="w-64">
            <option value="">Choose a region…</option>
            {HONEYMOON_DESTINATION_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            <option value="Other">Other (Ghana)</option>
          </Select>
        ) : (
          <input
            type="text"
            placeholder="e.g. Zanzibar, Dubai, Paris"
            value={customDestination}
            onChange={(e) => setCustomDestination(e.target.value)}
            className="w-64 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
          />
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Honeymoon style (choose as many as apply)</label>
        <div className="flex flex-wrap gap-3">
          {HONEYMOON_STYLES.map((style) => (
            <label key={style} className="flex items-center gap-2 text-sm text-akoma-ink/80">
              <Checkbox checked={styles.includes(style)} onChange={() => toggleStyle(style)} ariaLabel={style} />
              {style}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving…" : "Save honeymoon plan"}
        </Button>
        {saved && !isPending && <span className="text-xs text-akoma-green">Saved</span>}
      </div>
      {error && <p className="text-sm text-akoma-terracotta">{error}</p>}
    </form>
  );
}
