// src/lib/reference-data.ts
//
// Single source of truth for the app's global reference/catalog data —
// Vendor, Accommodation, TraditionalListItem — none of which belong to
// any one wedding plan. prisma/seed.ts's full local seed imports these
// same arrays (rather than hand-rolling its own copy) so there's exactly
// one place this content is written.
//
// ensureReferenceDataSeeded() exists because these three tables turned
// up completely empty in the shared Supabase Postgres database after a
// database migration — vendor/accommodation browsing silently showed an
// empty marketplace in production with nothing to indicate why. Rather
// than rely on remembering to run a seed command against every fresh
// database this app ever points at (a local reset, a new preview-branch
// database, ...), (app)/layout.tsx calls this once per warm server
// instance (see the module-level `checked` flag below) before any page
// under it can query these tables. Cheap in the common case — once
// checked is true, later calls in the same instance return immediately
// with no query at all; a fresh instance runs one COUNT per table.
//
// This never touches User/WeddingPlan/Guest/BudgetCategory/... — only
// ever inserts into these three global tables, and only when a table is
// completely empty (never on top of existing rows), so it can't create
// duplicates or touch anyone's real data.

import type { City } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const VENDOR_SEED_DATA: Array<{
  name: string;
  category:
    | "VENUE"
    | "CATERING"
    | "PHOTOGRAPHY"
    | "ATTIRE"
    | "DECOR"
    | "MUSIC"
    | "MAKEUP"
    | "TRANSPORT"
    | "CAKE"
    | "OTHER"
    | "JEWELLERY"
    | "MC"
    | "PLANNER";
  city: City;
  description: string;
  priceLowGHS: number;
  priceHighGHS: number;
  rating: number;
  contactPhone: string;
  isProFeatured: boolean;
}> = [
  // Venues
  { name: "Silver Star Gardens", category: "VENUE", city: "ACCRA", description: "Open-air garden venue in East Legon with seating for up to 400 guests.", priceLowGHS: 15000, priceHighGHS: 35000, rating: 4.7, contactPhone: "+233 24 111 2233", isProFeatured: true },
  { name: "La Villa Events Centre", category: "VENUE", city: "ACCRA", description: "Indoor/outdoor event centre near Labadi, popular for both engagement and reception.", priceLowGHS: 12000, priceHighGHS: 28000, rating: 4.4, contactPhone: "+233 24 111 2234", isProFeatured: false },
  { name: "Golden Bean Events Centre", category: "VENUE", city: "KUMASI", description: "Large hall in Adum with in-house parking for 150 cars.", priceLowGHS: 9000, priceHighGHS: 22000, rating: 4.5, contactPhone: "+233 24 111 2235", isProFeatured: true },
  { name: "Rattray Park Pavilion", category: "VENUE", city: "KUMASI", description: "Landscaped park pavilion, popular for outdoor traditional ceremonies.", priceLowGHS: 7000, priceHighGHS: 18000, rating: 4.3, contactPhone: "+233 24 111 2236", isProFeatured: false },

  // Catering
  { name: "Bisa's Kitchen Catering", category: "CATERING", city: "ACCRA", description: "Full-service Ghanaian and continental catering, from 100 to 1000 guests.", priceLowGHS: 60, priceHighGHS: 180, rating: 4.6, contactPhone: "+233 24 222 3344", isProFeatured: true },
  { name: "Auntie Muni's Catering Co.", category: "CATERING", city: "ACCRA", description: "Jollof, banku and grill specialists with a live-cooking station option.", priceLowGHS: 45, priceHighGHS: 130, rating: 4.5, contactPhone: "+233 24 222 3345", isProFeatured: false },
  { name: "Ashanti Delights Catering", category: "CATERING", city: "KUMASI", description: "Traditional Ashanti dishes plus continental menu options.", priceLowGHS: 50, priceHighGHS: 140, rating: 4.4, contactPhone: "+233 24 222 3346", isProFeatured: false },
  { name: "Kumasi Spice Catering", category: "CATERING", city: "KUMASI", description: "Full buffet catering with dedicated vegetarian menu line.", priceLowGHS: 55, priceHighGHS: 150, rating: 4.6, contactPhone: "+233 24 222 3347", isProFeatured: true },

  // Photography & Media
  { name: "Lensmen Studios", category: "PHOTOGRAPHY", city: "ACCRA", description: "Full-day wedding photography and same-week edited album.", priceLowGHS: 4500, priceHighGHS: 12000, rating: 4.8, contactPhone: "+233 24 333 4455", isProFeatured: true },
  { name: "Yaw Pare Photography", category: "PHOTOGRAPHY", city: "ACCRA", description: "Documentary-style wedding photography and drone coverage.", priceLowGHS: 3500, priceHighGHS: 9000, rating: 4.5, contactPhone: "+233 24 333 4456", isProFeatured: false },
  { name: "Garden City Lens Co.", category: "PHOTOGRAPHY", city: "KUMASI", description: "Photo and videography team covering both engagement and church events.", priceLowGHS: 3000, priceHighGHS: 8000, rating: 4.4, contactPhone: "+233 24 333 4457", isProFeatured: false },
  { name: "Adepa Photography", category: "PHOTOGRAPHY", city: "KUMASI", description: "Cinematic same-day-edit videography specialists.", priceLowGHS: 4000, priceHighGHS: 10000, rating: 4.7, contactPhone: "+233 24 333 4458", isProFeatured: true },

  // Attire
  { name: "Nsuo Bridal House", category: "ATTIRE", city: "ACCRA", description: "Custom bridal gowns and alterations, 6-week turnaround.", priceLowGHS: 3000, priceHighGHS: 15000, rating: 4.6, contactPhone: "+233 24 444 5566", isProFeatured: true },
  { name: "Adom Couture", category: "ATTIRE", city: "ACCRA", description: "Groom's suits and kaftans, made-to-measure.", priceLowGHS: 1200, priceHighGHS: 6000, rating: 4.3, contactPhone: "+233 24 444 5567", isProFeatured: false },
  { name: "Ashanti Kente Weavers", category: "ATTIRE", city: "KUMASI", description: "Authentic handwoven kente for both families, made to order.", priceLowGHS: 1500, priceHighGHS: 8000, rating: 4.9, contactPhone: "+233 24 444 5568", isProFeatured: true },
  { name: "Serwaa Bridal Studio", category: "ATTIRE", city: "KUMASI", description: "Bridal gowns for hire or custom-made, plus bridesmaid dresses.", priceLowGHS: 2000, priceHighGHS: 9000, rating: 4.4, contactPhone: "+233 24 444 5569", isProFeatured: false },

  // Decor
  { name: "Elegant Touch Decor", category: "DECOR", city: "ACCRA", description: "Full event styling: drapery, centrepieces, lighting.", priceLowGHS: 5000, priceHighGHS: 20000, rating: 4.5, contactPhone: "+233 24 555 6677", isProFeatured: false },
  { name: "Akwaaba Events Decor", category: "DECOR", city: "ACCRA", description: "Traditional-ceremony-focused decor with fabric backdrops.", priceLowGHS: 4000, priceHighGHS: 16000, rating: 4.4, contactPhone: "+233 24 555 6678", isProFeatured: true },
  { name: "Golden Palm Decor", category: "DECOR", city: "KUMASI", description: "Garden and hall decor packages with floral options.", priceLowGHS: 3500, priceHighGHS: 14000, rating: 4.3, contactPhone: "+233 24 555 6679", isProFeatured: false },
  { name: "Ohemaa Events & Decor", category: "DECOR", city: "KUMASI", description: "Premium stage and backdrop design for traditional and white weddings.", priceLowGHS: 4500, priceHighGHS: 18000, rating: 4.6, contactPhone: "+233 24 555 6680", isProFeatured: true },

  // Music
  { name: "DJ Skoolboi Entertainment", category: "MUSIC", city: "ACCRA", description: "DJ and MC combo package with sound system rental.", priceLowGHS: 2500, priceHighGHS: 7000, rating: 4.5, contactPhone: "+233 24 666 7788", isProFeatured: false },
  { name: "Vibes Live Band", category: "MUSIC", city: "ACCRA", description: "8-piece live band covering highlife, gospel and afrobeats.", priceLowGHS: 6000, priceHighGHS: 15000, rating: 4.7, contactPhone: "+233 24 666 7789", isProFeatured: true },
  { name: "Ashanti Cultural Troupe", category: "MUSIC", city: "KUMASI", description: "Traditional drumming and dance troupe for engagement ceremonies.", priceLowGHS: 3000, priceHighGHS: 8000, rating: 4.8, contactPhone: "+233 24 666 7790", isProFeatured: true },
  { name: "DJ Nyame Beats", category: "MUSIC", city: "KUMASI", description: "DJ services with MC and lighting rig.", priceLowGHS: 2000, priceHighGHS: 6000, rating: 4.3, contactPhone: "+233 24 666 7791", isProFeatured: false },

  // Makeup
  { name: "Glow by Akosua", category: "MAKEUP", city: "ACCRA", description: "Bridal makeup and hair, including trial session.", priceLowGHS: 800, priceHighGHS: 3000, rating: 4.6, contactPhone: "+233 24 777 8899", isProFeatured: false },
  { name: "Flawless Faces Accra", category: "MAKEUP", city: "ACCRA", description: "Full glam team for bride and bridal party.", priceLowGHS: 1200, priceHighGHS: 4500, rating: 4.7, contactPhone: "+233 24 777 8900", isProFeatured: true },
  { name: "Beauty by Abena", category: "MAKEUP", city: "KUMASI", description: "Natural and glam bridal makeup specialist.", priceLowGHS: 700, priceHighGHS: 2500, rating: 4.5, contactPhone: "+233 24 777 8901", isProFeatured: false },
  { name: "Kumasi Glam Studio", category: "MAKEUP", city: "KUMASI", description: "Bridal party glam packages with on-site touch-ups.", priceLowGHS: 900, priceHighGHS: 3200, rating: 4.4, contactPhone: "+233 24 777 8902", isProFeatured: false },
  { name: "Bridal Glow Studio", category: "MAKEUP", city: "ACCRA", description: "Hair styling and makeup team with a mobile on-location service.", priceLowGHS: 1000, priceHighGHS: 3800, rating: 4.6, contactPhone: "+233 24 777 8903", isProFeatured: false },
  { name: "Akosua Hair & Makeup Co.", category: "MAKEUP", city: "KUMASI", description: "Bridal hair and makeup with traditional-style updo specialists.", priceLowGHS: 850, priceHighGHS: 3000, rating: 4.7, contactPhone: "+233 24 777 8904", isProFeatured: true },

  // Transport
  { name: "Prestige Wedding Cars Accra", category: "TRANSPORT", city: "ACCRA", description: "Decorated luxury car hire for the couple and bridal party.", priceLowGHS: 1500, priceHighGHS: 6000, rating: 4.5, contactPhone: "+233 24 888 9900", isProFeatured: false },
  { name: "VIP Fleet Rentals", category: "TRANSPORT", city: "ACCRA", description: "Guest shuttle buses plus a decorated lead car.", priceLowGHS: 2500, priceHighGHS: 9000, rating: 4.3, contactPhone: "+233 24 888 9901", isProFeatured: false },
  { name: "Kumasi Classic Car Hire", category: "TRANSPORT", city: "KUMASI", description: "Vintage and modern luxury car hire with driver.", priceLowGHS: 1200, priceHighGHS: 5000, rating: 4.4, contactPhone: "+233 24 888 9902", isProFeatured: false },
  { name: "Golden Wheels Rentals", category: "TRANSPORT", city: "KUMASI", description: "Guest shuttle service for out-of-town family.", priceLowGHS: 1800, priceHighGHS: 6500, rating: 4.2, contactPhone: "+233 24 888 9903", isProFeatured: false },
  { name: "Royal Ride Wedding Cars", category: "TRANSPORT", city: "ACCRA", description: "Vintage Rolls-Royce and modern convertible hire for the couple's exit.", priceLowGHS: 2000, priceHighGHS: 8000, rating: 4.6, contactPhone: "+233 24 888 9904", isProFeatured: true },
  { name: "Ashanti Convoy Services", category: "TRANSPORT", city: "KUMASI", description: "Full-convoy planning for the wedding party plus a decorated lead car.", priceLowGHS: 1600, priceHighGHS: 6000, rating: 4.3, contactPhone: "+233 24 888 9905", isProFeatured: false },

  // Cake
  { name: "Sweet Delights Cakes", category: "CAKE", city: "ACCRA", description: "Multi-tier custom wedding cakes, delivery included.", priceLowGHS: 1200, priceHighGHS: 5000, rating: 4.6, contactPhone: "+233 24 999 0011", isProFeatured: false },
  { name: "The Cake Studio Accra", category: "CAKE", city: "ACCRA", description: "Modern cake design with tasting sessions.", priceLowGHS: 1500, priceHighGHS: 6000, rating: 4.7, contactPhone: "+233 24 999 0012", isProFeatured: true },
  { name: "Kumasi Cake Boutique", category: "CAKE", city: "KUMASI", description: "Custom-flavoured tiered cakes, halal options available.", priceLowGHS: 1000, priceHighGHS: 4500, rating: 4.5, contactPhone: "+233 24 999 0013", isProFeatured: false },
  { name: "Ohemaa's Cake Corner", category: "CAKE", city: "KUMASI", description: "Traditional and modern cake designs, small-batch bakery.", priceLowGHS: 900, priceHighGHS: 4000, rating: 4.4, contactPhone: "+233 24 999 0014", isProFeatured: false },

  // Jewellery
  { name: "Adorn Fine Jewellers", category: "JEWELLERY", city: "ACCRA", description: "Custom engagement rings and wedding bands, hand-set diamonds.", priceLowGHS: 2500, priceHighGHS: 15000, rating: 4.7, contactPhone: "+233 24 121 1122", isProFeatured: true },
  { name: "Golden Circle Jewellers", category: "JEWELLERY", city: "ACCRA", description: "Ready-to-wear and bespoke bridal jewellery sets.", priceLowGHS: 1500, priceHighGHS: 8000, rating: 4.5, contactPhone: "+233 24 121 1123", isProFeatured: false },
  { name: "Timeless Gems Accra", category: "JEWELLERY", city: "ACCRA", description: "Engagement rings with in-house resizing and engraving.", priceLowGHS: 1800, priceHighGHS: 9000, rating: 4.4, contactPhone: "+233 24 121 1124", isProFeatured: false },
  { name: "Kumasi Gold House", category: "JEWELLERY", city: "KUMASI", description: "Traditional gold jewellery for the bride and family, custom orders.", priceLowGHS: 2000, priceHighGHS: 12000, rating: 4.8, contactPhone: "+233 24 121 1125", isProFeatured: true },
  { name: "Ashanti Goldsmiths", category: "JEWELLERY", city: "KUMASI", description: "Handcrafted gold rings and beads from generations of goldsmithing.", priceLowGHS: 2200, priceHighGHS: 10000, rating: 4.6, contactPhone: "+233 24 121 1126", isProFeatured: false },

  // MC (Master of Ceremonies)
  { name: "MC Prince Events", category: "MC", city: "ACCRA", description: "Bilingual (English/Twi) MC known for keeping receptions lively.", priceLowGHS: 1500, priceHighGHS: 4000, rating: 4.6, contactPhone: "+233 24 232 2233", isProFeatured: false },
  { name: "Auntie Vee The Emcee", category: "MC", city: "ACCRA", description: "Warm, family-friendly hosting for traditional and white weddings.", priceLowGHS: 1200, priceHighGHS: 3500, rating: 4.5, contactPhone: "+233 24 232 2234", isProFeatured: false },
  { name: "MC Ohemaa Events", category: "MC", city: "ACCRA", description: "Elegant, script-driven hosting for formal receptions.", priceLowGHS: 1600, priceHighGHS: 4200, rating: 4.6, contactPhone: "+233 24 232 2235", isProFeatured: true },
  { name: "MC Konfem", category: "MC", city: "KUMASI", description: "High-energy MC with crowd games and grand-entrance hype.", priceLowGHS: 1000, priceHighGHS: 3000, rating: 4.7, contactPhone: "+233 24 232 2236", isProFeatured: true },
  { name: "Nana Yaw The Host", category: "MC", city: "KUMASI", description: "Experienced traditional-ceremony MC, fluent in Twi customs and protocol.", priceLowGHS: 1300, priceHighGHS: 3800, rating: 4.4, contactPhone: "+233 24 232 2237", isProFeatured: false },

  // Wedding Planner / Coordinator
  { name: "Grace Events Coordination", category: "PLANNER", city: "ACCRA", description: "Full-service day-of wedding coordination team.", priceLowGHS: 3000, priceHighGHS: 10000, rating: 4.6, contactPhone: "+233 24 343 3344", isProFeatured: true },
  { name: "Akoma Bespoke Weddings", category: "PLANNER", city: "ACCRA", description: "Full-service planning from budget breakdown to day-of coordination.", priceLowGHS: 8000, priceHighGHS: 25000, rating: 4.8, contactPhone: "+233 24 343 3345", isProFeatured: true },
  { name: "Kumasi Wedding Concierge", category: "PLANNER", city: "KUMASI", description: "Vendor liaison and day-of coordination service.", priceLowGHS: 2500, priceHighGHS: 8000, rating: 4.5, contactPhone: "+233 24 343 3346", isProFeatured: false },
  { name: "Ashanti Elite Wedding Planners", category: "PLANNER", city: "KUMASI", description: "Full planning and traditional-rites coordination for both ceremonies.", priceLowGHS: 6000, priceHighGHS: 20000, rating: 4.7, contactPhone: "+233 24 343 3347", isProFeatured: false },

  // Other
  { name: "Rev. Kofi Amankwah Officiant Services", category: "OTHER", city: "ACCRA", description: "Licensed officiant for church and civil ceremonies.", priceLowGHS: 500, priceHighGHS: 2000, rating: 4.7, contactPhone: "+233 24 000 1124", isProFeatured: false },
  { name: "Kente & Co. Stationery", category: "OTHER", city: "KUMASI", description: "Custom wedding invitations and stationery design and printing.", priceLowGHS: 800, priceHighGHS: 3500, rating: 4.5, contactPhone: "+233 24 000 1125", isProFeatured: false },
  { name: "Flashback Photo Booths", category: "OTHER", city: "ACCRA", description: "Reception photo-booth rental with props and instant prints.", priceLowGHS: 900, priceHighGHS: 2800, rating: 4.4, contactPhone: "+233 24 000 1126", isProFeatured: false },
];

export const TRADITIONAL_LIST_SEED_DATA: Array<{
  category: string;
  itemName: string;
  estLowGHS: number;
  estHighGHS: number;
  market: string;
  city: City;
  notes?: string;
}> = [
  { category: "Drinks", itemName: "Schnapps (bottle, for libation)", estLowGHS: 80, estHighGHS: 150, market: "Makola Market, Accra", city: "ACCRA", notes: "Usually 2–4 bottles requested by the family linguist." },
  { category: "Drinks", itemName: "Assorted malt drinks (crate)", estLowGHS: 120, estHighGHS: 200, market: "Makola Market, Accra", city: "ACCRA" },
  { category: "Drinks", itemName: "Bottled water (crate)", estLowGHS: 40, estHighGHS: 70, market: "Kejetia Market, Kumasi", city: "KUMASI" },
  { category: "Drinks", itemName: "Assorted soft drinks (crate)", estLowGHS: 60, estHighGHS: 100, market: "Kejetia Market, Kumasi", city: "KUMASI" },

  { category: "Kente & Cloth", itemName: "Kente cloth for the groom's family", estLowGHS: 1500, estHighGHS: 5000, market: "Kejetia Market, Kumasi", city: "KUMASI", notes: "Price varies widely by weave complexity and origin (Bonwire vs. machine-woven)." },
  { category: "Kente & Cloth", itemName: "Cloth (piece) for the bride's mother", estLowGHS: 300, estHighGHS: 900, market: "Kantamanto Market, Accra", city: "ACCRA" },
  { category: "Kente & Cloth", itemName: "Cloth (piece) for the groom's mother", estLowGHS: 300, estHighGHS: 900, market: "Kantamanto Market, Accra", city: "ACCRA" },
  { category: "Kente & Cloth", itemName: "Wax print set for bride's sisters (per person)", estLowGHS: 150, estHighGHS: 400, market: "Kejetia Market, Kumasi", city: "KUMASI" },

  { category: "Gifts for the Family", itemName: "Suitcase of provisions for the bride's family", estLowGHS: 800, estHighGHS: 2500, market: "Makola Market, Accra", city: "ACCRA" },
  { category: "Gifts for the Family", itemName: "Bible and ring box set", estLowGHS: 150, estHighGHS: 500, market: "Makola Market, Accra", city: "ACCRA" },
  { category: "Gifts for the Family", itemName: "Basket of assorted provisions", estLowGHS: 400, estHighGHS: 1200, market: "Kejetia Market, Kumasi", city: "KUMASI" },
  { category: "Gifts for the Family", itemName: "Shoes and bag set for the bride", estLowGHS: 500, estHighGHS: 2000, market: "Kantamanto Market, Accra", city: "ACCRA" },

  { category: "Money (Customary)", itemName: "\"Tiri nsa\" (head drink acknowledgement)", estLowGHS: 500, estHighGHS: 2000, market: "Family-agreed, Accra", city: "ACCRA", notes: "Amount is set by negotiation between the two families, not fixed — this is a wide estimate range only." },
  { category: "Money (Customary)", itemName: "Knocking/engagement fee", estLowGHS: 300, estHighGHS: 1500, market: "Family-agreed, Kumasi", city: "KUMASI", notes: "Varies significantly by family and ethnic tradition." },

  { category: "Jewelry", itemName: "Engagement ring", estLowGHS: 2000, estHighGHS: 15000, market: "Kantamanto Market, Accra", city: "ACCRA" },
  { category: "Jewelry", itemName: "Beads set for the bride", estLowGHS: 300, estHighGHS: 1200, market: "Kejetia Market, Kumasi", city: "KUMASI" },
];

/** nearVendorName is resolved to a real vendor id at seed time (see
 *  seedAccommodationData below) rather than baked in here, since which
 *  vendors exist (and their ids) isn't known until they're actually
 *  in the database. */
export const ACCOMMODATION_SEED_DATA: Array<{
  name: string;
  city: City;
  distanceFromVenueKm: number;
  priceLowGHS: number;
  priceHighGHS: number;
  contactPhone: string;
  nearVendorName: string;
  description: string;
  rating: number;
  amenities: string;
}> = [
  { name: "Erata Hotel", city: "ACCRA", distanceFromVenueKm: 3.2, priceLowGHS: 600, priceHighGHS: 1200, contactPhone: "+233 30 211 2233", nearVendorName: "Silver Star Gardens", description: "A polished business hotel in East Legon with spacious rooms and a rooftop pool — a comfortable, central base for out-of-town guests.", rating: 4.4, amenities: "Free WiFi, Pool, Breakfast included, Air conditioning, Gym" },
  { name: "Ridge Royal Hotel", city: "ACCRA", distanceFromVenueKm: 6.5, priceLowGHS: 900, priceHighGHS: 1800, contactPhone: "+233 30 211 2234", nearVendorName: "Silver Star Gardens", description: "An upscale hotel on The Ridge with elegant suites, full-service spa, and event-ready conference space for family gatherings.", rating: 4.6, amenities: "Free WiFi, Pool, Spa, Airport shuttle, Breakfast included" },
  { name: "Somewhere Nice Guesthouse", city: "ACCRA", distanceFromVenueKm: 1.8, priceLowGHS: 350, priceHighGHS: 700, contactPhone: "+233 30 211 2235", nearVendorName: "Silver Star Gardens", description: "A cozy, budget-friendly guesthouse just minutes from the venue — simple, clean rooms with a warm, homely feel.", rating: 4.1, amenities: "Free WiFi, Breakfast included, Air conditioning, Parking" },
  { name: "Villa Monticello Boutique Hotel", city: "ACCRA", distanceFromVenueKm: 4.8, priceLowGHS: 1100, priceHighGHS: 2200, contactPhone: "+233 30 211 2236", nearVendorName: "Silver Star Gardens", description: "A boutique retreat in Osu with individually styled rooms, lush courtyard gardens, and an intimate, design-forward feel.", rating: 4.7, amenities: "Free WiFi, Pool, Garden courtyard, Breakfast included, Bar" },
  { name: "La Maison Suites", city: "ACCRA", distanceFromVenueKm: 5.6, priceLowGHS: 750, priceHighGHS: 1500, contactPhone: "+233 30 211 2237", nearVendorName: "Silver Star Gardens", description: "Serviced apartment-style suites with kitchenettes — well suited to family members staying for the whole wedding weekend.", rating: 4.3, amenities: "Free WiFi, Kitchenette, Air conditioning, Laundry, Parking" },
  { name: "Fiesta Royale Hotel", city: "ACCRA", distanceFromVenueKm: 8.2, priceLowGHS: 500, priceHighGHS: 1000, contactPhone: "+233 30 211 2238", nearVendorName: "Silver Star Gardens", description: "A family-friendly resort-style hotel with expansive gardens and a large pool — a relaxed option for guests staying a few extra days.", rating: 4.2, amenities: "Free WiFi, Pool, Breakfast included, Kids' area, Parking" },
  { name: "Golden Tulip Kumasi City", city: "KUMASI", distanceFromVenueKm: 2.4, priceLowGHS: 700, priceHighGHS: 1400, contactPhone: "+233 32 202 3344", nearVendorName: "Golden Bean Events Centre", description: "An international-standard hotel in the city centre with reliable service and generous event space for wedding parties.", rating: 4.5, amenities: "Free WiFi, Pool, Breakfast included, Gym, Airport shuttle" },
  { name: "West Hills Hotel Kumasi", city: "KUMASI", distanceFromVenueKm: 5.1, priceLowGHS: 500, priceHighGHS: 1000, contactPhone: "+233 32 202 3345", nearVendorName: "Golden Bean Events Centre", description: "A dependable business hotel with modern rooms and easy access to the Kumasi ring road — practical for guests driving in.", rating: 4.0, amenities: "Free WiFi, Breakfast included, Air conditioning, Parking" },
  { name: "Noda Hotel Kumasi", city: "KUMASI", distanceFromVenueKm: 4.0, priceLowGHS: 450, priceHighGHS: 900, contactPhone: "+233 32 202 3346", nearVendorName: "Golden Bean Events Centre", description: "A contemporary mid-range hotel with bright, comfortable rooms and a popular in-house restaurant.", rating: 4.1, amenities: "Free WiFi, Restaurant, Air conditioning, Parking" },
  { name: "Lancaster Kumasi City Hotel", city: "KUMASI", distanceFromVenueKm: 3.3, priceLowGHS: 850, priceHighGHS: 1700, contactPhone: "+233 32 202 3347", nearVendorName: "Golden Bean Events Centre", description: "An upscale hotel with a rooftop pool and skyline views — a memorable stay for the couple's closest family and VIP guests.", rating: 4.6, amenities: "Free WiFi, Pool, Spa, Breakfast included, Gym" },
  { name: "Miklin Hotel", city: "KUMASI", distanceFromVenueKm: 6.0, priceLowGHS: 400, priceHighGHS: 800, contactPhone: "+233 32 202 3348", nearVendorName: "Golden Bean Events Centre", description: "A mid-range boutique hotel known for attentive, personal service and a quiet residential location.", rating: 4.2, amenities: "Free WiFi, Breakfast included, Air conditioning, Parking" },
  { name: "Vienna City Hotel & Suites", city: "KUMASI", distanceFromVenueKm: 7.4, priceLowGHS: 550, priceHighGHS: 1100, contactPhone: "+233 32 202 3349", nearVendorName: "Golden Bean Events Centre", description: "Spacious suites with sitting areas, well suited to families travelling together for the wedding weekend.", rating: 4.3, amenities: "Free WiFi, Kitchenette, Pool, Breakfast included" },
];

let checked = false;

/**
 * Idempotent: only ever inserts into a table that is completely empty,
 * and only ever touches Vendor/Accommodation/TraditionalListItem — never
 * User/WeddingPlan/Guest/anything wedding-specific. Safe to call on
 * every request; the in-memory `checked` flag means only the first call
 * per warm server instance does any real work (subsequent calls in the
 * same instance return immediately, no query at all).
 */
export async function ensureReferenceDataSeeded(): Promise<void> {
  if (checked) return;
  checked = true;

  const [vendorCount, accommodationCount, traditionalCount] = await Promise.all([
    prisma.vendor.count(),
    prisma.accommodation.count(),
    prisma.traditionalListItem.count(),
  ]);

  if (vendorCount === 0) {
    await prisma.vendor.createMany({ data: VENDOR_SEED_DATA });
  }

  if (accommodationCount === 0) {
    // Resolved by name rather than reusing a same-request createMany
    // result, so this works whether vendors were just created above or
    // already existed from an earlier run.
    const vendors = await prisma.vendor.findMany({ where: { name: { in: ["Silver Star Gardens", "Golden Bean Events Centre"] } }, select: { id: true, name: true } });
    const vendorIdByName = new Map(vendors.map((v) => [v.name, v.id]));
    await prisma.accommodation.createMany({
      data: ACCOMMODATION_SEED_DATA.map(({ nearVendorName, ...rest }) => ({
        ...rest,
        nearVendorId: vendorIdByName.get(nearVendorName),
      })),
    });
  }

  if (traditionalCount === 0) {
    await prisma.traditionalListItem.createMany({ data: TRADITIONAL_LIST_SEED_DATA });
  }
}
