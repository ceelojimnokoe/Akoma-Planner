// src/lib/accommodation-images.ts
//
// Same "real photo wins, else a placeholder" pattern as
// lib/vendor-images.ts. Accommodations have no category enum to key off
// of (unlike vendors), so the placeholder is picked from a small rotating
// set deterministically by id — stable across re-renders, no client state
// needed, and no two adjacent listings in a query's default id order are
// likely to collide.

import type { StaticImageData } from "next/image";
import hotel from "@/assets/images/accommodation/hotel.svg";
import guesthouse from "@/assets/images/accommodation/guesthouse.svg";
import boutique from "@/assets/images/accommodation/boutique.svg";
import resort from "@/assets/images/accommodation/resort.svg";

const PLACEHOLDERS: StaticImageData[] = [hotel, guesthouse, boutique, resort];

function hashToIndex(id: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

/** A real uploaded photo always wins; otherwise a stable rotating placeholder. */
export function getAccommodationImage(accommodation: { id: string; imageUrl: string | null }): StaticImageData | string {
  return accommodation.imageUrl || PLACEHOLDERS[hashToIndex(accommodation.id, PLACEHOLDERS.length)];
}
