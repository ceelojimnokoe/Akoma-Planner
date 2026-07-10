// src/components/dashboard/WeddingStyleCard.tsx
//
// Informational display of the couple's chosen theme/colors/dress code —
// deliberately NOT used to re-skin the app's own chrome or charts. The
// five akoma-* brand colors are load-bearing everywhere, including the
// dataviz-skill-validated chart palette on this same dashboard; re-theming
// the whole UI per-couple is a separate, much bigger feature.
//
// colorPalette is free text (e.g. "Gold, Ivory, Forest Green"), not hex
// codes — each word is tried directly as a CSS color keyword for the
// swatch dot. Most common color names are valid CSS keywords once
// lowercased with spaces removed ("Forest Green" -> "forestgreen"); if a
// word isn't recognized, the browser just renders no fill, which degrades
// harmlessly instead of erroring.

import { Card } from "@/components/ui/Card";

export function WeddingStyleCard({
  theme,
  colorPalette,
  dressCode,
}: {
  theme: string | null;
  colorPalette: string | null;
  dressCode: string | null;
}) {
  const colors = colorPalette ? colorPalette.split(",").map((c) => c.trim()).filter(Boolean) : [];

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-akoma-ink">Your wedding style</h2>
      <dl className="space-y-2 text-sm">
        {theme && (
          <div className="flex justify-between">
            <dt className="text-akoma-ink/50">Theme</dt>
            <dd className="text-akoma-ink">{theme}</dd>
          </div>
        )}
        {dressCode && (
          <div className="flex justify-between">
            <dt className="text-akoma-ink/50">Dress code</dt>
            <dd className="text-akoma-ink">{dressCode}</dd>
          </div>
        )}
        {colors.length > 0 && (
          <div className="flex items-center justify-between">
            <dt className="text-akoma-ink/50">Palette</dt>
            <dd className="flex items-center gap-1.5">
              {colors.map((c) => (
                <span
                  key={c}
                  title={c}
                  className="h-4 w-4 rounded-full border border-akoma-ink/15"
                  style={{ backgroundColor: c.toLowerCase().replace(/\s+/g, "") }}
                />
              ))}
            </dd>
          </div>
        )}
      </dl>
    </Card>
  );
}
