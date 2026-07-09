// src/components/ui/Badge.tsx
//
// Small labeled pill. Used throughout the app for plan/status tags — most
// importantly the honesty-labels this project's safety rules require:
// "Pro", "Estimate", "Mock", "Experimental", vendor-interest statuses, etc.
// Centralizing this one component is what keeps those labels visually
// consistent everywhere they appear, so they're always recognizable.

import clsx from "clsx";

type Tone = "gold" | "green" | "terracotta" | "neutral" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  gold: "bg-akoma-gold/15 text-akoma-gold border-akoma-gold/30",
  green: "bg-akoma-green/10 text-akoma-green border-akoma-green/30",
  terracotta: "bg-akoma-terracotta/10 text-akoma-terracotta border-akoma-terracotta/30",
  neutral: "bg-akoma-ink/5 text-akoma-ink/70 border-akoma-ink/15",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Pro-plan feature marker — same gold treatment everywhere it appears. */
export function ProBadge({ className }: { className?: string }) {
  return (
    <Badge tone="gold" className={className}>
      Pro
    </Badge>
  );
}

/** Marks any BisaAI output that isn't from a real model yet (safe-by-design:
 *  stubs must be visibly labelled as stubs). */
export function MockBadge({ className }: { className?: string }) {
  return (
    <Badge tone="neutral" className={className}>
      Mock — not a real AI call
    </Badge>
  );
}

/** Marks any price BisaAI produces (safe-by-design: estimates are never
 *  presented as firm prices). */
export function EstimateBadge({ className }: { className?: string }) {
  return (
    <Badge tone="info" className={className}>
      Estimate
    </Badge>
  );
}
