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
// VendorCategory (10 values, what VendorCard/vendor listings use) and
// the onboarding wizard's OnboardingVendorCategory (12 values, what the
// dashboard's Vendor Status card uses). Both point at the same 14-image
// set — swapping a placeholder file's contents (or a vendor's real
// imageUrl) never requires touching the components below.

import type { StaticImageData } from "next/image";
import venue from "@/assets/images/vendors/venue.svg";
import photographer from "@/assets/images/vendors/photographer.svg";
import videographer from "@/assets/images/vendors/videographer.svg";
import caterer from "@/assets/images/vendors/caterer.svg";
import djBand from "@/assets/images/vendors/dj-band.svg";
import mc from "@/assets/images/vendors/mc.svg";
import decor from "@/assets/images/vendors/decor.svg";
import florist from "@/assets/images/vendors/florist.svg";
import makeup from "@/assets/images/vendors/makeup.svg";
import hair from "@/assets/images/vendors/hair.svg";
import cake from "@/assets/images/vendors/cake.svg";
import transportation from "@/assets/images/vendors/transportation.svg";
import attire from "@/assets/images/vendors/attire.svg";
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
};

/** Keyed by the onboarding wizard's 12-category list (dashboard's Vendor Status card). */
export const ONBOARDING_CATEGORY_IMAGES: Record<string, StaticImageData> = {
  VENUE: venue,
  PHOTOGRAPHER: photographer,
  VIDEOGRAPHER: videographer,
  CATERER: caterer,
  DJ_BAND: djBand,
  MC: mc,
  DECOR: decor,
  FLORIST: florist,
  MAKEUP: makeup,
  HAIR: hair,
  CAKE: cake,
  TRANSPORTATION: transportation,
};

/** A real uploaded photo always wins; otherwise the vendor's category placeholder. */
export function getVendorImage(vendor: { imageUrl: string | null; category: string }): StaticImageData | string {
  return vendor.imageUrl || VENDOR_CATEGORY_IMAGES[vendor.category] || other;
}
