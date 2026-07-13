// src/lib/vendor-images.ts
//
// One place that answers "what image for this vendor?" — a real uploaded
// photo (Vendor.imageUrl) always wins; otherwise a category placeholder
// from src/assets/images/vendors/. Static imports (not public/ URLs) so
// Next.js reads each file's real dimensions at build time, same reasoning
// as components/ui/Logo.tsx.
//
// Two lookup tables, not one, because two different category enums exist
// in this codebase on purpose (see prisma/schema.prisma's
// OnboardingVendorCategory comment): the real Vendor catalog's
// VendorCategory (13 values, what VendorCard/vendor listings use) and
// the onboarding wizard's OnboardingVendorCategory (14 values, what the
// dashboard's Vendor Status card uses). MC reuses the same mc.svg in both
// tables; swapping a placeholder file's contents (or a vendor's real
// imageUrl) never requires touching the components below.

import type { StaticImageData } from "next/image";
import venue from "@/assets/images/vendors/venue.svg";
import photographer from "@/assets/images/vendors/photographer.svg";
import videographer from "@/assets/images/vendors/videographer.svg";
import caterer from "@/assets/images/vendors/caterer.svg";
import djBand from "@/assets/images/vendors/dj-band.svg";
import mc from "@/assets/images/vendors/mc.svg";
import decor from "@/assets/images/vendors/decor.svg";
import planner from "@/assets/images/vendors/planner.svg";
import makeup from "@/assets/images/vendors/makeup.svg";
import jewellery from "@/assets/images/vendors/jewellery.svg";
import cake from "@/assets/images/vendors/cake.svg";
import transportation from "@/assets/images/vendors/transportation.svg";
import attire from "@/assets/images/vendors/attire.svg";
import bridalWear from "@/assets/images/vendors/bridal-wear.svg";
import groomsWear from "@/assets/images/vendors/grooms-wear.svg";
import other from "@/assets/images/vendors/other.svg";

/** Keyed by the real Vendor catalog's category enum (VendorCard, vendor listings, /vendors/[vendorId]). */
export const VENDOR_CATEGORY_IMAGES: Record<string, StaticImageData> = {
  VENUE: venue,
  CATERING: caterer,
  PHOTOGRAPHY: photographer,
  ATTIRE: attire,
  DECOR: decor,
  MUSIC: djBand,
  MAKEUP: makeup,
  TRANSPORT: transportation,
  CAKE: cake,
  OTHER: other,
  JEWELLERY: jewellery,
  MC: mc,
  PLANNER: planner,
};

/** Keyed by the onboarding wizard's 14-category list (dashboard's Vendor Status card). */
export const ONBOARDING_CATEGORY_IMAGES: Record<string, StaticImageData> = {
  VENUE: venue,
  PHOTOGRAPHER: photographer,
  VIDEOGRAPHER: videographer,
  CATERER: caterer,
  DECOR: decor,
  PLANNER: planner,
  DJ_BAND: djBand,
  MC: mc,
  BRIDAL_WEAR: bridalWear,
  GROOMS_WEAR: groomsWear,
  MAKEUP: makeup,
  JEWELLERY: jewellery,
  CAKE: cake,
  TRANSPORTATION: transportation,
};

/** A real uploaded photo always wins; otherwise the vendor's category placeholder. */
export function getVendorImage(vendor: { imageUrl: string | null; category: string }): StaticImageData | string {
  return vendor.imageUrl || VENDOR_CATEGORY_IMAGES[vendor.category] || other;
}
