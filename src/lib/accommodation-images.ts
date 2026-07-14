// src/lib/accommodation-images.ts
//
// Same "real photo wins, else a placeholder" pattern as
// lib/vendor-images.ts. Accommodations have no category enum to key off
// of (unlike vendors), so the placeholder pool mixes the original SVG
// icons with real curated hotel/resort/room photos, picked from a
// deterministic rotating set by id (see lib/deterministic-pick.ts) —
// stable across re-renders, no client state needed, and no two adjacent
// listings in a query's default id order are likely to collide.
//
// Each real photo appears twice in the pool (the SVGs once) so a real
// photo shows roughly 70% of the time — for a hotel/resort listing a
// generic building icon reads far more "prototype" than it does for,
// say, an MC vendor, so this bucket is deliberately weighted toward the
// real photos rather than split evenly with the icons.

import type { StaticImageData } from "next/image";
import { hashToIndex } from "./deterministic-pick";
import hotel from "@/assets/images/accommodation/hotel.svg";
import guesthouse from "@/assets/images/accommodation/guesthouse.svg";
import boutique from "@/assets/images/accommodation/boutique.svg";
import resort from "@/assets/images/accommodation/resort.svg";
import resortVilla from "@/assets/images/accommodation/bilderboken-rlwE8f8anOc-unsplash.jpg";
import resortPoolMountain from "@/assets/images/accommodation/sara-dubler-Koei_7yYtIo-unsplash.jpg";
import beachfrontPool from "@/assets/images/accommodation/sasha-kaunas-TAgGZWz6Qg8-unsplash.jpg";
import poolSunset from "@/assets/images/accommodation/valeriia-bugaiova-_pPHgeHz1uk-unsplash.jpg";
import hotelRoom from "@/assets/images/accommodation/vojtech-bruzek-Yrxr3bsPdS0-unsplash.jpg";

const PLACEHOLDERS: StaticImageData[] = [
  hotel,
  guesthouse,
  boutique,
  resort,
  resortVilla,
  resortVilla,
  resortPoolMountain,
  resortPoolMountain,
  beachfrontPool,
  beachfrontPool,
  poolSunset,
  poolSunset,
  hotelRoom,
  hotelRoom,
];

/** A real uploaded photo always wins; otherwise a stable rotating placeholder. */
export function getAccommodationImage(accommodation: { id: string; imageUrl: string | null }): StaticImageData | string {
  return accommodation.imageUrl || PLACEHOLDERS[hashToIndex(accommodation.id, PLACEHOLDERS.length)];
}
