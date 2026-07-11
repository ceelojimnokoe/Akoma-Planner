// src/components/onboarding/ColorPaletteField.tsx
//
// Shared between the onboarding wizard's Style step and the /profile edit
// form. Native <input type="color"> is a real OS/browser RGB picker — no
// picker library needed. Presets are just one click that fills the same
// two fields the native pickers write to, nothing exclusive about them.

import { WEDDING_PALETTES } from "@/lib/wedding-palettes";

export function ColorPaletteField({
  primaryColor,
  secondaryColor,
  onPrimaryChange,
  onSecondaryChange,
}: {
  // Optional because FormState (ProfileForm.tsx) mirrors CoupleProfileInput's
  // own optional string fields — the `|| "#87A96B"` / falsy checks below
  // already treat "" and undefined identically, so no extra defaulting
  // needed at the call sites (same tolerance <Input>/<Select> already have
  // for their own value props).
  primaryColor: string | undefined;
  secondaryColor: string | undefined;
  onPrimaryChange: (hex: string) => void;
  onSecondaryChange: (hex: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-akoma-ink">Primary color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={primaryColor || "#87A96B"}
              onChange={(e) => onPrimaryChange(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-akoma-ink/15 p-1"
              aria-label="Primary color"
            />
            <span className="text-sm text-akoma-ink/60">{primaryColor || "#87A96B"}</span>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-akoma-ink">Secondary color (optional)</label>
          {secondaryColor ? (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => onSecondaryChange(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-akoma-ink/15 p-1"
                aria-label="Secondary color"
              />
              <span className="text-sm text-akoma-ink/60">{secondaryColor}</span>
              <button
                type="button"
                onClick={() => onSecondaryChange("")}
                className="text-xs text-akoma-ink/50 hover:text-akoma-terracotta"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onSecondaryChange("#F7E7CE")}
              className="rounded-lg border border-dashed border-akoma-ink/25 px-3 py-2 text-sm text-akoma-ink/50 hover:border-akoma-ink/40 hover:text-akoma-ink/70"
            >
              + Add secondary color
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-akoma-ink">Or pick a preset</p>
        <div className="flex flex-wrap gap-2">
          {WEDDING_PALETTES.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => {
                onPrimaryChange(p.primary);
                onSecondaryChange(p.secondary);
              }}
              title={p.name}
              className="flex items-center gap-1.5 rounded-full border border-akoma-ink/15 py-1 pl-1 pr-3 text-xs text-akoma-ink/70 hover:border-akoma-green"
            >
              <span className="flex h-5 w-5 overflow-hidden rounded-full border border-akoma-ink/10">
                <span className="w-1/2" style={{ backgroundColor: p.primary }} />
                <span className="w-1/2" style={{ backgroundColor: p.secondary }} />
              </span>
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
