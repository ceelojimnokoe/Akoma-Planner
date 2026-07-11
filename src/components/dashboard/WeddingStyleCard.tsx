// src/components/dashboard/WeddingStyleCard.tsx
//
// Informational display of the couple's chosen theme/colors/dress code —
// deliberately NOT used to re-skin the app's own chrome or charts. The
// five akoma-* brand colors are load-bearing everywhere, including the
// dataviz-skill-validated chart palette on this same dashboard; re-theming
// the whole UI per-couple is a separate, much bigger feature.
//
// primaryColor/secondaryColor are real hex strings chosen via a color
// picker or preset (see lib/wedding-palettes.ts) — rendered directly as
// swatches, no free-text color-name guessing needed.

import { Card } from "@/components/ui/Card";

export function WeddingStyleCard({
  theme,
  primaryColor,
  secondaryColor,
  dressCode,
}: {
  theme: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  dressCode: string | null;
}) {
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
        {primaryColor && (
          <div className="flex items-center justify-between">
            <dt className="text-akoma-ink/50">Palette</dt>
            <dd className="flex items-center gap-1.5">
              <span
                title={primaryColor}
                className="h-4 w-4 rounded-full border border-akoma-ink/15"
                style={{ backgroundColor: primaryColor }}
              />
              {secondaryColor && (
                <span
                  title={secondaryColor}
                  className="h-4 w-4 rounded-full border border-akoma-ink/15"
                  style={{ backgroundColor: secondaryColor }}
                />
              )}
            </dd>
          </div>
        )}
      </dl>
    </Card>
  );
}
