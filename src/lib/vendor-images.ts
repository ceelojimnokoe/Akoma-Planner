// src/lib/vendor-images.ts
//
// One place that answers "what image for this vendor?" — a real uploaded
// photo (Vendor.imageUrl) always wins; otherwise a real curated photo for
// that vendor's category if one exists (picked stably per-vendor via
// hashToIndex, since several vendors in a category legitimately share a
// small photo pool — see lib/deterministic-pick.ts); otherwise the
// category's own SVG icon, same fallback of last resort this file always
// had. Static imports (not public/ URLs) so Next.js reads each file's
// real dimensions at build time, same reasoning as components/ui/Logo.tsx.
//
// Two lookup tables, not one, because two different category enums exist
// in this codebase on purpose (see prisma/schema.prisma's
// OnboardingVendorCategory comment): the real Vendor catalog's
// VendorCategory (13 values, what VendorCard/vendor listings use) and
// the onboarding wizard's OnboardingVendorCategory (14 values, what the
// dashboard's Vendor Status card uses). The dashboard's card is a
// category-level status summary, not a specific vendor, so it stays
// SVG-only — there's no per-vendor id there to hash a photo pick from.

import type { StaticImageData } from "next/image";
import { hashToIndex } from "./deterministic-pick";

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

// Real curated photos, sorted into the folders they were dropped into —
// one or more per category that had a clear match. Categories with no
// real photo yet (ATTIRE, MUSIC, MC, PLANNER, OTHER, and the onboarding-
// only VIDEOGRAPHER/DJ_BAND/BRIDAL_WEAR/GROOMS_WEAR/TRANSPORTATION) keep
// their SVG icon exactly as before — not every category needs a photo
// for the marketplace to feel real, and a wrong-feeling stretch match
// would be worse than a clean icon.
import venuePhoto1 from "@/assets/images/vendors/venues/matthew-essman-jTnipV64uLo-unsplash.jpg";
import venuePhoto2 from "@/assets/images/vendors/venues/thomas-william-OAVqa8hQvWI-unsplash.jpg";
import photographerPhoto1 from "@/assets/images/vendors/photographers/alexander-wang-KjyrxSHwqTg-unsplash.jpg";
import photographerPhoto2 from "@/assets/images/vendors/photographers/marco-xu-ToUPBCO62Lw-unsplash.jpg";
import photographerPhoto3 from "@/assets/images/vendors/photographers/reinhart-julian-WxM465oM4j4-unsplash.jpg";
import decorPhoto1 from "@/assets/images/vendors/decorators/fabio-guntur-qG2yK_iNspE-unsplash.jpg";
import decorPhoto2 from "@/assets/images/vendors/decorators/shardayyy-photography-fJzmPe-a0eU-unsplash.jpg";
import cateringPhoto1 from "@/assets/images/vendors/catering/jay-wennington-N_Y88TWmGwA-unsplash.jpg";
import cateringPhoto2 from "@/assets/images/vendors/catering/katarzyna-pracuch-V98W_4pCrVA-unsplash.jpg";
import jewelleryPhoto1 from "@/assets/images/vendors/jewellery/alvin-mahmudov-9_XfcBxf_uo-unsplash.jpg";
import jewelleryPhoto2 from "@/assets/images/vendors/jewellery/sandy-millar-8vaQKYnawHw-unsplash.jpg";
import cakePhoto1 from "@/assets/images/vendors/cake/david-holifield-7ePjhwxtxCU-unsplash.jpg";
import cakePhoto2 from "@/assets/images/vendors/cake/david-holifield-sCsjtUwN8LA-unsplash.jpg";
import transportPhoto1 from "@/assets/images/vendors/transport/richard-r-FZ5MkHkeyKM-unsplash.jpg";
import makeupPhoto1 from "@/assets/images/vendors/makeup/rosa-rafael-DEuob2v77wI-unsplash.jpg";
import makeupPhoto2 from "@/assets/images/vendors/makeup/rosa-rafael-pxax5WuM7eY-unsplash.jpg";

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

/** Real photo pools, keyed by VendorCategory — only the categories a real
 *  photo actually suited. A category absent here just falls through to
 *  its SVG icon in getVendorImage below. */
const VENDOR_CATEGORY_PHOTOS: Partial<Record<string, StaticImageData[]>> = {
  VENUE: [venuePhoto1, venuePhoto2],
  PHOTOGRAPHY: [photographerPhoto1, photographerPhoto2, photographerPhoto3],
  DECOR: [decorPhoto1, decorPhoto2],
  CATERING: [cateringPhoto1, cateringPhoto2],
  JEWELLERY: [jewelleryPhoto1, jewelleryPhoto2],
  CAKE: [cakePhoto1, cakePhoto2],
  TRANSPORT: [transportPhoto1],
  MAKEUP: [makeupPhoto1, makeupPhoto2],
};

/** A real uploaded photo always wins; otherwise a real curated photo for
 *  the category (stable per vendor id) if one exists; otherwise the
 *  category's SVG icon. */
export function getVendorImage(vendor: { id: string; imageUrl: string | null; category: string }): StaticImageData | string {
  if (vendor.imageUrl) return vendor.imageUrl;
  const photos = VENDOR_CATEGORY_PHOTOS[vendor.category];
  if (photos && photos.length > 0) return photos[hashToIndex(vendor.id, photos.length)];
  return VENDOR_CATEGORY_IMAGES[vendor.category] || other;
}
