// src/lib/invitation-templates.ts
//
// Single source of truth for invitation template ids/names/tiers — no
// JSX here deliberately, so this can be imported from both the carousel
// client component (which pairs each id with its actual visual markup)
// and the server action that validates a selection, without pulling
// React JSX rendering into a server-action bundle for no reason.

export type InvitationTemplateTier = "free" | "pass";

export interface InvitationTemplateMeta {
  id: string;
  name: string;
  tier: InvitationTemplateTier;
}

export const INVITATION_TEMPLATES: InvitationTemplateMeta[] = [
  { id: "kente-gold", name: "Kente Gold", tier: "free" },
  { id: "botanical-green", name: "Botanical Green", tier: "free" },
  { id: "minimal-ink", name: "Minimal Ink", tier: "free" },
  { id: "adinkra-terracotta", name: "Adinkra Terracotta", tier: "pass" },
  { id: "royal-gradient", name: "Royal Gold", tier: "pass" },
  { id: "floral-cream", name: "Floral Cream", tier: "pass" },
  { id: "two-tone-split", name: "Two-Tone Split", tier: "pass" },
  { id: "vintage-frame", name: "Vintage Frame", tier: "pass" },
  { id: "modern-monochrome", name: "Modern Monochrome", tier: "pass" },
];

export function getInvitationTemplateMeta(id: string): InvitationTemplateMeta | undefined {
  return INVITATION_TEMPLATES.find((t) => t.id === id);
}
