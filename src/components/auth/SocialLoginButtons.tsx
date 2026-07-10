// src/components/auth/SocialLoginButtons.tsx
//
// Visibly present, genuinely disabled — not silently fake-clickable. No
// OAuth is wired up (see LEARNING.md), so rather than pretend these work,
// each one is a real disabled <button> with a "Coming soon" badge.

import { Badge } from "@/components/ui/Badge";

const PROVIDERS = ["Google", "Apple", "Facebook", "Microsoft"];

export function SocialLoginButtons() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {PROVIDERS.map((name) => (
        <button
          key={name}
          type="button"
          disabled
          title="Coming soon"
          className="flex cursor-not-allowed items-center justify-between gap-2 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm text-akoma-ink/40"
        >
          <span>{name}</span>
          <Badge tone="neutral">Soon</Badge>
        </button>
      ))}
    </div>
  );
}
