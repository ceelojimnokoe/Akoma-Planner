// src/lib/guest-group.ts
//
// Shared label/tone lookup for Guest.guestGroup — a free-form
// relationship tag (Bride's family, VIP, etc.) used by the seating
// chart's grouping indicators and, since the field lives on Guest
// itself, also editable from the Guest List page. One lookup, two call
// sites, same convention as PRIORITY_TONE in ChecklistItemRow.tsx.
//
// Badge.tsx only has 5 tones for 7 groups, so BRIDESMAID/VIP share gold
// and PARENT/CHILD share neutral — acceptable since the badge always
// renders its text label alongside the color, never color alone.

import type { GuestGroup } from "@prisma/client";
import type { Tone } from "@/components/ui/Badge";

export const GUEST_GROUP_LABEL: Record<GuestGroup, string> = {
  BRIDE_FAMILY: "Bride's Family",
  GROOM_FAMILY: "Groom's Family",
  BRIDESMAID: "Bridesmaid",
  GROOMSMAN: "Groomsman",
  VIP: "VIP",
  PARENT: "Parent",
  CHILD: "Child",
};

export const GUEST_GROUP_TONE: Record<GuestGroup, Tone> = {
  BRIDE_FAMILY: "terracotta",
  GROOM_FAMILY: "green",
  BRIDESMAID: "gold",
  GROOMSMAN: "info",
  VIP: "gold",
  PARENT: "neutral",
  CHILD: "neutral",
};

export const GUEST_GROUP_OPTIONS: GuestGroup[] = [
  "BRIDE_FAMILY",
  "GROOM_FAMILY",
  "BRIDESMAID",
  "GROOMSMAN",
  "VIP",
  "PARENT",
  "CHILD",
];
