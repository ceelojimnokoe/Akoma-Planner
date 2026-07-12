// src/components/ui/Badge.tsx
//
// Small labeled pill. Used throughout the app for plan/status tags — most
// importantly the honesty-labels this project's safety rules require:
// "Pass", "Featured", "Estimate", "Mock", "Experimental", vendor-interest
// statuses, etc.
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

/** Marks a vendor LISTING as featured (Vendor.isProFeatured) — a property
 *  of that listing, unrelated to whether the viewer has the Wedding
 *  Pass. See PassBadge below for the viewer's-own-access marker; keeping
 *  the two separate is deliberate (see vendors/[vendorId]/page.tsx's
 *  header comment on why the two gates must be kept straight) — this is
 *  also why this badge says "Featured," not "Pass": the two concepts
 *  can appear on the same card, and "Pass-featured listing" next to
 *  "unlock with the Pass" would read as one confused idea instead of
 *  two distinct ones. "Featured" matches VendorFilters.tsx's own
 *  Standard/Featured wording for this exact concept. */
export function FeaturedBadge({ className }: { className?: string }) {
  return (
    <Badge tone="gold" className={className}>
      Featured
    </Badge>
  );
}

/** Marks a feature that requires the Wedding Pass (the viewer's own,
 *  one-time-purchase access level) — same gold treatment as
 *  FeaturedBadge, used for a different concept. See FeaturedBadge above. */
export function PassBadge({ className }: { className?: string }) {
  return (
    <Badge tone="gold" className={className}>
      Pass
    </Badge>
  );
}

/** Marks any BisaAI output that isn't from a real model yet (safe-by-design:
 *  stubs must be visibly labelled as stubs). AI surfaces only — for
 *  non-AI demo flows (e.g. password reset, email verification), use
 *  DemoOnlyBadge below instead. */
export function MockBadge({ className }: { className?: string }) {
  return (
    <Badge tone="neutral" className={className}>
      Mock — not a real AI call
    </Badge>
  );
}

/** Marks a non-AI demo flow that doesn't do the real-world thing it looks
 *  like it does (e.g. no email is actually sent). Same honesty-labeling
 *  rule as MockBadge, just worded for a flow that has nothing to do with AI. */
export function DemoOnlyBadge({ className }: { className?: string }) {
  return (
    <Badge tone="neutral" className={className}>
      Demo only — nothing is sent
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
