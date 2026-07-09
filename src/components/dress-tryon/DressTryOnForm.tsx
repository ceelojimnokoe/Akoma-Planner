// src/components/dress-tryon/DressTryOnForm.tsx
//
// Safe rule #2, built out: explicit consent required before anything
// happens, a persistent disclaimer (not just a one-time modal), and the
// photo the user picks is used ONLY for an in-browser preview via
// URL.createObjectURL — it is never uploaded, never sent to the server
// action, and never leaves the browser tab. runDressTryOn() (see
// src/server/actions/bisaai.ts) doesn't even accept a photo parameter,
// so there's no code path here that could accidentally forward it.

"use client";

import { useState, useTransition } from "react";
import { runDressTryOn } from "@/server/actions/bisaai";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const DRESS_STYLES = ["A-line", "Ball Gown", "Mermaid", "Sheath", "Kaba & Slit"];

const PERSISTENT_DISCLAIMER =
  "Experimental preview — not accurate. This tool does not reflect how any real dress will actually look on you, and must not be used to make purchase decisions.";

export function DressTryOnForm({ weddingPlanId }: { weddingPlanId: string }) {
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [dressStyle, setDressStyle] = useState(DRESS_STYLES[0]);
  const [result, setResult] = useState<Awaited<ReturnType<typeof runDressTryOn>> | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(file ? URL.createObjectURL(file) : null);
    setResult(null);
  }

  function handleGenerate() {
    startTransition(async () => {
      setResult(await runDressTryOn(weddingPlanId, consentGiven, dressStyle));
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-akoma-terracotta/30 bg-akoma-terracotta/5 px-4 py-3 text-sm text-akoma-terracotta">
        ⚠ {PERSISTENT_DISCLAIMER}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-akoma-ink">Upload a full-body photo</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-akoma-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-akoma-ink/5 file:px-3 file:py-2 file:text-sm file:font-medium file:text-akoma-ink hover:file:bg-akoma-ink/10"
        />
        <p className="mt-1 text-xs text-akoma-ink/40">
          Your photo stays in this browser tab only — it is not uploaded or sent anywhere in this demo build.
        </p>
      </div>

      {photoPreviewUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- local object URL, never touches next/image's remote/optimization pipeline
        <img src={photoPreviewUrl} alt="Your uploaded photo (local preview only)" className="h-48 w-36 rounded-lg object-cover" />
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-akoma-ink">Dress style</label>
        <select
          value={dressStyle}
          onChange={(e) => setDressStyle(e.target.value)}
          className="rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        >
          {DRESS_STYLES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-2 text-sm text-akoma-ink/80">
        <input
          type="checkbox"
          checked={consentGiven}
          onChange={(e) => setConsentGiven(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-akoma-ink/30 text-akoma-green focus:ring-akoma-green"
        />
        <span>
          I understand this generates an approximate, experimental preview only — it is not accurate and I won&apos;t
          use it to make purchase decisions.
        </span>
      </label>

      <Button disabled={!consentGiven || !photoPreviewUrl || isPending} onClick={handleGenerate}>
        {isPending ? "Generating…" : "Generate preview"}
      </Button>

      {result && !result.ok && <p className="text-sm text-akoma-terracotta">{result.error}</p>}

      {result?.ok && (
        <div className="space-y-2 border-t border-akoma-ink/10 pt-5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-akoma-ink">Generated preview</p>
            <Badge tone="terracotta">Experimental</Badge>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- local trusted static SVG placeholder */}
          <img src={result.data.previewImageUrl} alt="Placeholder dress try-on preview" className="w-64 rounded-lg border border-akoma-ink/10" />
          <p className="text-xs text-akoma-ink/50">{result.meta.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
