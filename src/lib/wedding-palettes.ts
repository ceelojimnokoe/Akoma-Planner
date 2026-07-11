// src/lib/wedding-palettes.ts
//
// One-click preset color pairs for the onboarding wizard's Style step and
// the /profile edit form — shared so the two pickers never drift apart.
// Each preset just pre-fills the same primaryColor/secondaryColor hex
// fields a couple could also reach via the native color picker; nothing
// here is exclusive to picking a preset.

export interface WeddingPalette {
  name: string;
  primary: string;
  secondary: string;
}

export const WEDDING_PALETTES: WeddingPalette[] = [
  { name: "Garden Romance", primary: "#87A96B", secondary: "#F7E7CE" },
  { name: "Classic Gold & Ivory", primary: "#D4AF37", secondary: "#FFFFF0" },
  { name: "Modern Emerald", primary: "#046307", secondary: "#D4AF37" },
  { name: "Terracotta Sunset", primary: "#C1502E", secondary: "#F4C2C2" },
  { name: "Royal Blue & Gold", primary: "#002366", secondary: "#D4AF37" },
  { name: "Blush & Burgundy", primary: "#800020", secondary: "#F7CAC9" },
];
