// prisma/seed.ts
//
// Populates the local SQLite database with realistic Ghana-relevant sample
// data so every screen has real content to show, even before a real user
// has entered anything. Run with `npm run db:seed` (wraps `tsx prisma/seed.ts`).
//
// Layout: global reference data first (vendors, traditional-list items,
// accommodation — these don't belong to any one wedding), then one sample
// user + wedding plan with budget/checklist/guests/vendor-interest data
// hanging off it.
//
// Note: this file imports from src/lib via relative paths, not the "@/"
// alias — tsx (used to run this standalone script) doesn't resolve
// tsconfig path aliases the way Next.js's bundler does, so relative
// imports are the reliable choice here.

import { randomUUID } from "crypto";
import {
  PrismaClient,
  City,
  VendorCategory,
  Side,
  RsvpStatus,
  VendorInterestStatus,
  VendorBookingProgress,
  OnboardingVendorCategory,
} from "@prisma/client";
import { buildDefaultChecklist, ONBOARDING_CATEGORY_CHECKLIST_TITLES } from "../src/lib/checklist-defaults";
import { buildDefaultHoneymoonChecklist } from "../src/lib/honeymoon-defaults";
import { buildDefaultTraditionalCeremonyItems, resolveTraditionalCeremonyCatalogCity } from "../src/lib/traditional-ceremony-defaults";
import { deriveCategoryBookingStatus } from "../src/lib/vendor-booking-progress";
import {
  DEMO_USER_EMAIL,
  DEMO_USER_PASSWORD,
  TEST_PASS_USER_EMAIL,
  TEST_PASS_USER_PASSWORD,
  FREE_TEST_USER_EMAIL,
  FREE_TEST_USER_PASSWORD,
} from "../src/lib/session";
import { WEDDING_PASS_AMOUNT_GHS } from "../src/lib/pricing";
import { createSupabaseAdminClient } from "../src/lib/supabase/admin";

const prisma = new PrismaClient();

/**
 * Gives a seeded account a real Supabase Auth identity via the Admin API,
 * so its email/password are genuine, working login credentials post-seed
 * — not just local rows. Falls back to a random, unclaimable placeholder
 * id (same pattern as server/actions/collaboration.ts's placeholder
 * collaborators) when SUPABASE_SERVICE_ROLE_KEY isn't configured, so the
 * rest of the seed still runs — that account's *login* just won't work
 * until real credentials are set and the database is reseeded. Reused
 * for both the demo account and the dev-only Wedding Pass test account
 * below — same Supabase dance either way.
 */
async function getOrCreateSupabaseId(email: string, password: string, name: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    console.warn(
      `  SUPABASE_SERVICE_ROLE_KEY not set — skipping ${email}'s real Supabase identity. ` +
        `It will exist in this local database but can't log in until you set ` +
        "SUPABASE_SERVICE_ROLE_KEY in .env and re-run `npm run db:seed`."
    );
    return randomUUID();
  }

  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existing = existingUsers.users.find((u) => u.email === email);
  if (existing) return existing.id;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data.user) {
    console.warn(`  Failed to create the Supabase user for ${email} (${error?.message}) — using a placeholder identity instead.`);
    return randomUUID();
  }
  return data.user.id;
}

async function main() {
  console.log("Seeding AkomaPlanner...");

  await clearExistingData();

  const vendors = await seedVendors();
  await seedTraditionalListItems();
  await seedAccommodations(vendors);
  await seedSampleWedding(vendors);

  // Dev/local only — never touches a production database. Lets anyone
  // working on Pass-gated features (Collaboration, Design Tools, etc.)
  // log in with an account that already has the Pass, without going
  // through a real Paystack payment.
  if (process.env.NODE_ENV !== "production") {
    await seedTestPassWedding(vendors);
    await seedFreeTestAccount(vendors);
  }

  console.log("Seed complete.");
}

async function clearExistingData() {
  // Order matters: children before parents, to respect foreign keys.
  await prisma.aIInteractionLog.deleteMany();
  await prisma.vendorInterest.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.budgetCategory.deleteMany();
  await prisma.vendorBookingStatus.deleteMany();
  await prisma.coupleProfile.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.weddingMember.deleteMany();
  await prisma.weddingPlan.deleteMany();
  await prisma.accommodation.deleteMany();
  await prisma.traditionalListItem.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();
}

// ---------------------------------------------------------------------------
// Vendors — several per category, split across Accra and Kumasi
// ---------------------------------------------------------------------------

async function seedVendors() {
  const vendorData: Array<{
    name: string;
    category: VendorCategory;
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

  const created = await Promise.all(
    vendorData.map((v) => prisma.vendor.create({ data: v }))
  );

  console.log(`  seeded ${created.length} vendors`);
  return created;
}

// ---------------------------------------------------------------------------
// Traditional list items — ESTIMATED price ranges only, tied to a real market
// ---------------------------------------------------------------------------

async function seedTraditionalListItems() {
  const items: Array<{
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

  await prisma.traditionalListItem.createMany({ data: items });
  console.log(`  seeded ${items.length} traditional list items`);
}

// ---------------------------------------------------------------------------
// Accommodation — loosely linked to a seeded venue vendor for distance context
// ---------------------------------------------------------------------------

async function seedAccommodations(vendors: Awaited<ReturnType<typeof seedVendors>>) {
  const accraVenue = vendors.find((v) => v.name === "Silver Star Gardens");
  const kumasiVenue = vendors.find((v) => v.name === "Golden Bean Events Centre");

  const accommodations = [
    {
      name: "Erata Hotel",
      city: "ACCRA" as City,
      distanceFromVenueKm: 3.2,
      priceLowGHS: 600,
      priceHighGHS: 1200,
      contactPhone: "+233 30 211 2233",
      nearVendorId: accraVenue?.id,
      description: "A polished business hotel in East Legon with spacious rooms and a rooftop pool — a comfortable, central base for out-of-town guests.",
      rating: 4.4,
      amenities: "Free WiFi, Pool, Breakfast included, Air conditioning, Gym",
    },
    {
      name: "Ridge Royal Hotel",
      city: "ACCRA" as City,
      distanceFromVenueKm: 6.5,
      priceLowGHS: 900,
      priceHighGHS: 1800,
      contactPhone: "+233 30 211 2234",
      nearVendorId: accraVenue?.id,
      description: "An upscale hotel on The Ridge with elegant suites, full-service spa, and event-ready conference space for family gatherings.",
      rating: 4.6,
      amenities: "Free WiFi, Pool, Spa, Airport shuttle, Breakfast included",
    },
    {
      name: "Somewhere Nice Guesthouse",
      city: "ACCRA" as City,
      distanceFromVenueKm: 1.8,
      priceLowGHS: 350,
      priceHighGHS: 700,
      contactPhone: "+233 30 211 2235",
      nearVendorId: accraVenue?.id,
      description: "A cozy, budget-friendly guesthouse just minutes from the venue — simple, clean rooms with a warm, homely feel.",
      rating: 4.1,
      amenities: "Free WiFi, Breakfast included, Air conditioning, Parking",
    },
    {
      name: "Villa Monticello Boutique Hotel",
      city: "ACCRA" as City,
      distanceFromVenueKm: 4.8,
      priceLowGHS: 1100,
      priceHighGHS: 2200,
      contactPhone: "+233 30 211 2236",
      nearVendorId: accraVenue?.id,
      description: "A boutique retreat in Osu with individually styled rooms, lush courtyard gardens, and an intimate, design-forward feel.",
      rating: 4.7,
      amenities: "Free WiFi, Pool, Garden courtyard, Breakfast included, Bar",
    },
    {
      name: "La Maison Suites",
      city: "ACCRA" as City,
      distanceFromVenueKm: 5.6,
      priceLowGHS: 750,
      priceHighGHS: 1500,
      contactPhone: "+233 30 211 2237",
      nearVendorId: accraVenue?.id,
      description: "Serviced apartment-style suites with kitchenettes — well suited to family members staying for the whole wedding weekend.",
      rating: 4.3,
      amenities: "Free WiFi, Kitchenette, Air conditioning, Laundry, Parking",
    },
    {
      name: "Fiesta Royale Hotel",
      city: "ACCRA" as City,
      distanceFromVenueKm: 8.2,
      priceLowGHS: 500,
      priceHighGHS: 1000,
      contactPhone: "+233 30 211 2238",
      nearVendorId: accraVenue?.id,
      description: "A family-friendly resort-style hotel with expansive gardens and a large pool — a relaxed option for guests staying a few extra days.",
      rating: 4.2,
      amenities: "Free WiFi, Pool, Breakfast included, Kids' area, Parking",
    },
    {
      name: "Golden Tulip Kumasi City",
      city: "KUMASI" as City,
      distanceFromVenueKm: 2.4,
      priceLowGHS: 700,
      priceHighGHS: 1400,
      contactPhone: "+233 32 202 3344",
      nearVendorId: kumasiVenue?.id,
      description: "An international-standard hotel in the city centre with reliable service and generous event space for wedding parties.",
      rating: 4.5,
      amenities: "Free WiFi, Pool, Breakfast included, Gym, Airport shuttle",
    },
    {
      name: "West Hills Hotel Kumasi",
      city: "KUMASI" as City,
      distanceFromVenueKm: 5.1,
      priceLowGHS: 500,
      priceHighGHS: 1000,
      contactPhone: "+233 32 202 3345",
      nearVendorId: kumasiVenue?.id,
      description: "A dependable business hotel with modern rooms and easy access to the Kumasi ring road — practical for guests driving in.",
      rating: 4.0,
      amenities: "Free WiFi, Breakfast included, Air conditioning, Parking",
    },
    {
      name: "Noda Hotel Kumasi",
      city: "KUMASI" as City,
      distanceFromVenueKm: 4.0,
      priceLowGHS: 450,
      priceHighGHS: 900,
      contactPhone: "+233 32 202 3346",
      nearVendorId: kumasiVenue?.id,
      description: "A contemporary mid-range hotel with bright, comfortable rooms and a popular in-house restaurant.",
      rating: 4.1,
      amenities: "Free WiFi, Restaurant, Air conditioning, Parking",
    },
    {
      name: "Lancaster Kumasi City Hotel",
      city: "KUMASI" as City,
      distanceFromVenueKm: 3.3,
      priceLowGHS: 850,
      priceHighGHS: 1700,
      contactPhone: "+233 32 202 3347",
      nearVendorId: kumasiVenue?.id,
      description: "An upscale hotel with a rooftop pool and skyline views — a memorable stay for the couple's closest family and VIP guests.",
      rating: 4.6,
      amenities: "Free WiFi, Pool, Spa, Breakfast included, Gym",
    },
    {
      name: "Miklin Hotel",
      city: "KUMASI" as City,
      distanceFromVenueKm: 6.0,
      priceLowGHS: 400,
      priceHighGHS: 800,
      contactPhone: "+233 32 202 3348",
      nearVendorId: kumasiVenue?.id,
      description: "A mid-range boutique hotel known for attentive, personal service and a quiet residential location.",
      rating: 4.2,
      amenities: "Free WiFi, Breakfast included, Air conditioning, Parking",
    },
    {
      name: "Vienna City Hotel & Suites",
      city: "KUMASI" as City,
      distanceFromVenueKm: 7.4,
      priceLowGHS: 550,
      priceHighGHS: 1100,
      contactPhone: "+233 32 202 3349",
      nearVendorId: kumasiVenue?.id,
      description: "Spacious suites with sitting areas, well suited to families travelling together for the wedding weekend.",
      rating: 4.3,
      amenities: "Free WiFi, Kitchenette, Pool, Breakfast included",
    },
  ];

  await prisma.accommodation.createMany({ data: accommodations });
  console.log(`  seeded ${accommodations.length} accommodations`);
}

// ---------------------------------------------------------------------------
// Sample user + wedding plan, with budget/checklist/guests/vendor-interest data
// ---------------------------------------------------------------------------

async function seedSampleWedding(vendors: Awaited<ReturnType<typeof seedVendors>>) {
  const supabaseId = await getOrCreateSupabaseId(DEMO_USER_EMAIL, DEMO_USER_PASSWORD, "Ama Owusu");
  const user = await prisma.user.create({
    data: {
      supabaseId,
      email: DEMO_USER_EMAIL,
      name: "Ama Owusu",
      authProvider: "email",
      emailVerified: true,
    },
  });

  // Six months out — long enough for buildDefaultChecklist() (see
  // checklist-defaults.ts) to spread the full range of default tasks
  // across a believable near-term-to-long-lead-time mix, which is what
  // makes the dashboard and calendar views meaningful out of the box.
  const weddingDate = new Date();
  weddingDate.setMonth(weddingDate.getMonth() + 6);

  const weddingPlan = await prisma.weddingPlan.create({
    data: {
      coupleNames: "Ama & Kwame",
      weddingDate,
      totalBudgetGHS: 120_000,
      city: "ACCRA",
      guestEstimate: 250,
      tradition: "Akan",
      hasWeddingPass: false, // seeded as Free on purpose — see LEARNING.md: lets the paywall/gating be demoed immediately
      ownerUserId: user.id,
      members: {
        create: { userId: user.id, role: "OWNER" },
      },
      // Demo data for the onboarding-driven dashboard personalization —
      // shows what a couple who completed the full wizard would see.
      coupleProfile: {
        create: {
          partner1Name: "Ama Owusu",
          partner2Name: "Kwame Boateng",
          displayName1: "Ama",
          displayName2: "Kwame",
          partner1Phone: "0244000000",
          partner2Phone: "0244000001",
          partner2Email: "kwame.boateng@example.com",
          ceremonyDate: weddingDate,
          venueName: "La Beach Gardens, Accra",
          indoorOutdoor: "OUTDOOR",
          weddingType: "MULTIPLE_CEREMONIES",
          bridalPartySize: 6,
          groomPartySize: 6,
          budgetFlexibility: "SOMEWHAT_FLEXIBLE",
          isDiaspora: false,
          theme: "Garden Romance",
          primaryColor: "#87A96B",
          secondaryColor: "#F7E7CE",
          dressCode: "Formal, with kente accents",
          biggestConcern: "Coordinating both families' schedules for the traditional rites",
          planningExperience: "FIRST_TIME",
          diyVsProfessional: "A_MIX",
          communicationStyle: "WEEKLY_CHECK_IN",
          culturalReligiousRequirements: "Akan customary rites (knocking + engagement) before the white wedding",
        },
      },
      vendorBookingStatuses: {
        createMany: {
          data: [
            { category: "VENUE", status: "BOOKED" },
            { category: "PHOTOGRAPHER", status: "RESEARCHING" },
            { category: "VIDEOGRAPHER", status: "NOT_STARTED" },
            { category: "CATERER", status: "RESEARCHING" },
            { category: "DECOR", status: "RESEARCHING" },
            { category: "PLANNER", status: "RESEARCHING" },
            { category: "DJ_BAND", status: "NOT_STARTED" },
            { category: "MC", status: "NOT_STARTED" },
            { category: "BRIDAL_WEAR", status: "RESEARCHING" },
            { category: "GROOMS_WEAR", status: "NOT_STARTED" },
            { category: "MAKEUP", status: "BOOKED" },
            { category: "JEWELLERY", status: "RESEARCHING" },
            { category: "CAKE", status: "NOT_STARTED" },
            { category: "TRANSPORTATION", status: "NOT_STARTED" },
          ],
        },
      },
    },
  });

  await seedBudgetCategories(weddingPlan.id);
  await seedChecklist(weddingPlan.id, weddingDate);
  await seedGuests(weddingPlan.id);
  const touchedCategories = await seedVendorInterests(weddingPlan.id, vendors);
  await syncSeededVendorBooking(weddingPlan.id, touchedCategories);
  await seedTraditionalCeremonyItems(weddingPlan.id);
  await seedHoneymoonPlan(weddingPlan.id);
  await seedAiLogs(weddingPlan.id);

  console.log(`  seeded wedding plan "${weddingPlan.coupleNames}" (${weddingPlan.id})`);
}

async function seedBudgetCategories(weddingPlanId: string) {
  // Names match ONBOARDING_VENDOR_CATEGORIES' labels exactly (plus
  // Accommodation) — same set every new wedding plan gets by default via
  // buildDefaultBudgetCategories(), just populated here with realistic
  // demo amounts instead of the real zero-filled starting state.
  const categories = [
    { name: "Venue", allocatedGHS: 30000, spentGHS: 15000 },
    { name: "Catering", allocatedGHS: 25000, spentGHS: 5000 },
    { name: "Photography", allocatedGHS: 8000, spentGHS: 3000 },
    { name: "Videography", allocatedGHS: 4000, spentGHS: 0 },
    { name: "Decoration", allocatedGHS: 10000, spentGHS: 0 },
    { name: "Wedding Planner / Coordinator", allocatedGHS: 6000, spentGHS: 0 },
    { name: "Entertainment / DJ", allocatedGHS: 5000, spentGHS: 0 },
    { name: "Master of Ceremonies (MC)", allocatedGHS: 3000, spentGHS: 0 },
    { name: "Bridal Wear", allocatedGHS: 9000, spentGHS: 5000 },
    { name: "Groom's Wear", allocatedGHS: 5000, spentGHS: 3000 },
    { name: "Hair & Makeup", allocatedGHS: 4500, spentGHS: 3200 },
    { name: "Jewellery", allocatedGHS: 4000, spentGHS: 0 },
    { name: "Cake", allocatedGHS: 2000, spentGHS: 0 },
    { name: "Transportation", allocatedGHS: 5000, spentGHS: 0 },
    { name: "Accommodation", allocatedGHS: 7000, spentGHS: 1500 },
    // spentGHS here matches the sum of seedTraditionalCeremonyItems' own
    // spentGHS values below — the real sync action derives this
    // automatically on every mutation, but the seed script writes both
    // sides by hand since it doesn't go through that action.
    { name: "Traditional Customary", allocatedGHS: 25000, spentGHS: 12350 },
  ];

  await prisma.budgetCategory.createMany({
    data: categories.map((c) => ({ ...c, weddingPlanId })),
  });
}

async function seedChecklist(weddingPlanId: string, weddingDate: Date) {
  const items = buildDefaultChecklist(weddingDate);

  // Every default item's due date now falls within [today, weddingDate] by
  // construction (see buildDefaultChecklist's proportional rescale), so a
  // fresh seed has no genuinely overdue items to mark done — correct for a
  // real new plan, but it would leave the demo at "0% done" out of the box.
  // Mark the earliest third of tasks (by due date) done by hand instead, so
  // the seeded checklist still shows believable in-progress texture.
  const sortedByDueDate = [...items].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const doneTitles = new Set(sortedByDueDate.slice(0, Math.floor(sortedByDueDate.length / 3)).map((item) => item.title));

  await prisma.checklistItem.createMany({
    data: items.map((item) => ({
      weddingPlanId,
      title: item.title,
      category: item.category,
      dueDate: item.dueDate,
      isDefault: item.isDefault,
      priority: item.priority,
      done: doneTitles.has(item.title),
    })),
  });
}

async function seedGuests(weddingPlanId: string) {
  const guestData: Array<{ name: string; side: Side; rsvpStatus: RsvpStatus; contact?: string; plusOne?: boolean }> = [
    { name: "Kofi Mensah", side: "GROOM", rsvpStatus: "YES", contact: "0244000001", plusOne: true },
    { name: "Abena Boateng", side: "BRIDE", rsvpStatus: "YES", contact: "0244000002" },
    { name: "Yaw Asante", side: "GROOM", rsvpStatus: "PENDING", contact: "0244000003" },
    { name: "Efua Owusu", side: "BRIDE", rsvpStatus: "YES", contact: "0244000004", plusOne: true },
    { name: "Kwabena Osei", side: "GROOM", rsvpStatus: "NO", contact: "0244000005" },
    { name: "Adjoa Frimpong", side: "BRIDE", rsvpStatus: "YES", contact: "0244000006" },
    { name: "Kwesi Appiah", side: "GROOM", rsvpStatus: "PENDING", contact: "0244000007" },
    { name: "Akosua Darko", side: "BRIDE", rsvpStatus: "YES", contact: "0244000008" },
    { name: "Kwame Adjei", side: "GROOM", rsvpStatus: "YES", contact: "0244000009", plusOne: true },
    { name: "Abenaa Sarpong", side: "BRIDE", rsvpStatus: "PENDING", contact: "0244000010" },
    { name: "Nana Yaw Boadi", side: "BOTH", rsvpStatus: "YES", contact: "0244000011" },
    { name: "Gifty Amoah", side: "BRIDE", rsvpStatus: "YES", contact: "0244000012" },
    { name: "Emmanuel Tetteh", side: "GROOM", rsvpStatus: "YES", contact: "0244000013" },
    { name: "Comfort Ansah", side: "BRIDE", rsvpStatus: "NO", contact: "0244000014" },
    { name: "Isaac Agyeman", side: "GROOM", rsvpStatus: "YES", contact: "0244000015", plusOne: true },
    { name: "Rita Kufuor", side: "BRIDE", rsvpStatus: "PENDING", contact: "0244000016" },
    { name: "Samuel Opoku", side: "GROOM", rsvpStatus: "YES", contact: "0244000017" },
    { name: "Vida Nkrumah", side: "BOTH", rsvpStatus: "YES", contact: "0244000018" },
  ];

  await prisma.guest.createMany({
    data: guestData.map((g) => ({ ...g, weddingPlanId })),
  });
}

async function seedVendorInterests(weddingPlanId: string, vendors: Awaited<ReturnType<typeof seedVendors>>) {
  const byName = (name: string) => vendors.find((v) => v.name === name)!;

  const interests: Array<{
    vendorId: string;
    status?: VendorInterestStatus;
    bookingProgress: VendorBookingProgress;
    onboardingCategory: OnboardingVendorCategory | null;
    draftMessage?: string;
    quoteAmountGHS?: number;
    notes?: string;
  }> = [
    {
      vendorId: byName("Silver Star Gardens").id,
      status: "ACCEPTED",
      bookingProgress: "BOOKED",
      onboardingCategory: "VENUE",
      draftMessage: "Hi, we'd love to book Silver Star Gardens for our reception on the wedding date — could you confirm availability and send a quote for 250 guests?",
      quoteAmountGHS: 28000,
      notes: "Booked — deposit paid outside the app for now (payments are stubbed in this MVP).",
    },
    // Backs the MAKEUP category's VendorBookingStatus (seeded BOOKED
    // above) with a real interest — previously there was no VendorInterest
    // row for any Makeup vendor at all, a pre-existing inconsistency this
    // now resolves for the first time.
    {
      vendorId: byName("Flawless Faces Accra").id,
      status: "ACCEPTED",
      bookingProgress: "BOOKED",
      onboardingCategory: "MAKEUP",
      draftMessage: "Hi, we'd love to book your team for bridal party glam on the morning of the wedding — could you confirm availability?",
      quoteAmountGHS: 3200,
      notes: "Booked directly after a trial session.",
    },
    {
      vendorId: byName("Bisa's Kitchen Catering").id,
      status: "QUOTED",
      bookingProgress: "NEGOTIATING",
      onboardingCategory: "CATERER",
      draftMessage: "Hello, could you share a catering quote for 250 guests, mixed Ghanaian and continental menu?",
      quoteAmountGHS: 22500,
      notes: "Quote received — negotiating a package rate before approving.",
    },
    {
      vendorId: byName("Lensmen Studios").id,
      status: "SENT",
      bookingProgress: "ENQUIRY_SENT",
      onboardingCategory: "PHOTOGRAPHER",
      draftMessage: "Hi Lensmen Studios, we're planning our wedding and would like a full-day photography + drone package quote.",
      notes: "Message sent, awaiting vendor reply.",
    },
    // ATTIRE now guesses BRIDAL_WEAR (see guessOnboardingCategory) — this
    // used to be the demo example of "not tracked as a booking category"
    // back when ATTIRE had no onboarding equivalent at all.
    {
      vendorId: byName("Ashanti Kente Weavers").id,
      status: "DRAFT",
      bookingProgress: "SHORTLISTED",
      onboardingCategory: "BRIDAL_WEAR",
      draftMessage: "Hello, we'd like a custom kente order for both families — could you let us know pricing and lead time?",
      notes: "Drafted by BisaAI, not yet sent — couple still reviewing wording.",
    },
    // Two shortlisted-but-no-enquiry-sent Decor vendors — exercises the
    // "Vendor Status" ungated section on a bare, status-only interest row
    // (no draftMessage), plus BisaAI's "shortlisted but stalled" nudge.
    {
      vendorId: byName("Elegant Touch Decor").id,
      bookingProgress: "SHORTLISTED",
      onboardingCategory: "DECOR",
      notes: "Saved from browsing — liked their portfolio.",
    },
    {
      vendorId: byName("Akwaaba Events Decor").id,
      bookingProgress: "SHORTLISTED",
      onboardingCategory: "DECOR",
      notes: "Saved from browsing — traditional-ceremony backdrop style.",
    },
    // Exercises the new PLANNER/JEWELLERY categories — MC is deliberately
    // left with zero interests, so the demo still shows a genuinely
    // untouched category for the Health Score tooltip / BisaAI's
    // not-contacted nudges.
    {
      vendorId: byName("Akoma Bespoke Weddings").id,
      bookingProgress: "SHORTLISTED",
      onboardingCategory: "PLANNER",
      notes: "Saved from browsing — full-service package looks promising.",
    },
    {
      vendorId: byName("Kumasi Gold House").id,
      bookingProgress: "SHORTLISTED",
      onboardingCategory: "JEWELLERY",
      notes: "Saved from browsing — liked their custom gold sets.",
    },
  ];

  for (const interest of interests) {
    await prisma.vendorInterest.create({ data: { ...interest, weddingPlanId } });
  }

  return [...new Set(interests.map((i) => i.onboardingCategory).filter((c): c is OnboardingVendorCategory => c != null))];
}

/** Mirrors server/actions/vendor-booking.ts's two sync helpers using
 *  plain Prisma calls — deliberately not importing that "use server"
 *  file here (seed.ts stays a fully standalone script per its own
 *  header comment, and those helpers' real home already calls
 *  revalidatePath(), which has no meaning outside a Next.js request).
 *  Without this, the seeded VendorBookingStatus rows and default
 *  checklist items would start in a stale, disconnected snapshot
 *  instead of the consistent state a real booking action leaves them in
 *  — exactly the kind of mismatch this whole feature exists to fix. */
async function syncSeededVendorBooking(weddingPlanId: string, categories: OnboardingVendorCategory[]) {
  for (const category of categories) {
    const interests = await prisma.vendorInterest.findMany({
      where: { weddingPlanId, onboardingCategory: category },
      select: { bookingProgress: true },
    });

    const status = deriveCategoryBookingStatus(interests.map((i) => i.bookingProgress));
    await prisma.vendorBookingStatus.upsert({
      where: { weddingPlanId_category: { weddingPlanId, category } },
      create: { weddingPlanId, category, status },
      update: { status },
    });

    const titles = ONBOARDING_CATEGORY_CHECKLIST_TITLES[category];
    const hasBooked = interests.some((i) => i.bookingProgress === "BOOKED");
    if (titles && titles.length > 0 && hasBooked) {
      await prisma.checklistItem.updateMany({
        where: { weddingPlanId, isDefault: true, title: { in: titles }, done: false },
        data: { done: true },
      });
    }
  }
}

async function seedTraditionalCeremonyItems(weddingPlanId: string) {
  // spentGHS values here sum to 12350 — matches seedBudgetCategories'
  // "Traditional Customary" spentGHS by hand (the real sync action would
  // derive this automatically on every mutation; the seed script writes
  // both sides itself since it never calls that action).
  const items = [
    { name: "Schnapps (bottle, for libation)", category: "Drinks", allocatedGHS: 150, spentGHS: 150, done: true },
    { name: "Kente cloth for the groom's family", category: "Kente & Cloth", allocatedGHS: 3000, spentGHS: 3000, done: true },
    { name: "Suitcase of provisions for the bride's family", category: "Gifts for the Family", allocatedGHS: 1500, spentGHS: 0, done: false },
    { name: "\"Tiri nsa\" (head drink acknowledgement)", category: "Money (Customary)", allocatedGHS: 1200, spentGHS: 1200, done: true },
    { name: "Engagement ring", category: "Jewelry", allocatedGHS: 8000, spentGHS: 8000, done: true },
    { name: "Beads set for the bride", category: "Jewelry", allocatedGHS: 600, spentGHS: 0, done: false },
    { name: "Bible and ring box set", category: "Gifts for the Family", allocatedGHS: 300, spentGHS: 0, done: false },
    { name: "Cloth (piece) for the bride's mother", category: "Kente & Cloth", allocatedGHS: 600, spentGHS: 0, done: false },
  ];

  await prisma.traditionalCeremonyItem.createMany({
    data: items.map((i) => ({ ...i, weddingPlanId, isDefault: false })),
  });
}

async function seedHoneymoonPlan(weddingPlanId: string) {
  await prisma.honeymoonPlan.create({
    data: {
      weddingPlanId,
      destination: "Cape Coast",
      styles: "Relaxation, Cultural Experience",
      allocatedGHS: 15000,
      spentGHS: 3000,
    },
  });

  // seedSampleWedding's own weddingPlan.create() call is a separate,
  // hand-rolled create (not the real createWeddingPlan action), so it
  // doesn't get the honeymoonChecklistItems nested block that action
  // adds for real signups — seed those defaults explicitly here instead.
  const doneTitles = new Set(["Decide destination", "Set honeymoon budget"]);
  await prisma.honeymoonChecklistItem.createMany({
    data: buildDefaultHoneymoonChecklist().map((item) => ({
      ...item,
      weddingPlanId,
      done: doneTitles.has(item.title),
    })),
  });
}

async function seedAiLogs(weddingPlanId: string) {
  const logs = [
    { functionName: "basicQA", inputSummary: "\"What's a good order of events for an Akan traditional wedding?\"", outputSummary: "Suggested a typical running order: family arrival, linguist introductions, bride price presentation, blessing, reception." },
    { functionName: "sourceVendors", inputSummary: "category=CATERING, city=ACCRA", outputSummary: "Returned 2 matching vendors from the local database." },
    { functionName: "draftVendorMessage", inputSummary: "vendor=Lensmen Studios", outputSummary: "Drafted an enquiry message (status: SENT after couple approval)." },
    { functionName: "priceTraditionalList", inputSummary: "tradition=Akan, city=ACCRA", outputSummary: "Returned estimated price ranges for 16 traditional list items, labelled as estimates." },
  ];

  await prisma.aIInteractionLog.createMany({
    data: logs.map((l) => ({ ...l, weddingPlanId, isMock: true })),
  });
}

// ---------------------------------------------------------------------------
// Dev-only Wedding Pass test account — separate from the demo account
// above, so the Free-vs-Pass paywall stays demoable there while this one
// gives anyone testing Pass features (Collaboration, Design Tools, the
// guest cap, etc.) a frictionless way in, without a real Paystack charge.
// Kept deliberately lean: a wedding plan, a Payment row explaining why
// hasWeddingPass is true, a default checklist, and a small guest list —
// enough for every Pass-gated tool to have real content to work with,
// without duplicating the demo account's full data set.
// ---------------------------------------------------------------------------

async function seedTestPassWedding(vendors: Awaited<ReturnType<typeof seedVendors>>) {
  const supabaseId = await getOrCreateSupabaseId(TEST_PASS_USER_EMAIL, TEST_PASS_USER_PASSWORD, "Pass Test Account");
  const user = await prisma.user.create({
    data: {
      supabaseId,
      email: TEST_PASS_USER_EMAIL,
      name: "Pass Test Account",
      authProvider: "email",
      emailVerified: true,
    },
  });

  const weddingDate = new Date();
  weddingDate.setMonth(weddingDate.getMonth() + 6);

  const weddingPlan = await prisma.weddingPlan.create({
    data: {
      coupleNames: "Pass Test Account",
      weddingDate,
      totalBudgetGHS: 100_000,
      city: "KUMASI",
      guestEstimate: 150,
      tradition: "Ashanti",
      hasWeddingPass: true,
      ownerUserId: user.id,
      members: {
        create: { userId: user.id, role: "OWNER" },
      },
    },
  });

  // Represents what a real successful Paystack payment would leave
  // behind (see confirmPaymentSuccess in server/actions/billing.ts) —
  // labelled "dev-seed" rather than "paystack" so it's never mistaken
  // for a real charge if anyone inspects the Payment table.
  await prisma.payment.create({
    data: {
      weddingPlanId: weddingPlan.id,
      provider: "dev-seed",
      reference: `dev-seed-pass-${weddingPlan.id}`,
      amountGHS: WEDDING_PASS_AMOUNT_GHS,
      status: "SUCCESS",
    },
  });

  const items = buildDefaultChecklist(weddingDate);
  await prisma.checklistItem.createMany({
    data: items.map((item) => ({
      weddingPlanId: weddingPlan.id,
      title: item.title,
      category: item.category,
      dueDate: item.dueDate,
      isDefault: item.isDefault,
      priority: item.priority,
    })),
  });

  // Same structural defaults every real signup gets via createWeddingPlan
  // (not curated demo content) — this account is "deliberately lean," but
  // that means no rich hand-picked data, not missing the same day-one
  // rows a real Pass account would have.
  const traditionalCatalogItems = await prisma.traditionalListItem.findMany({
    where: { city: resolveTraditionalCeremonyCatalogCity(weddingPlan.city) },
  });
  await prisma.traditionalCeremonyItem.createMany({
    data: buildDefaultTraditionalCeremonyItems(traditionalCatalogItems).map((item) => ({ ...item, weddingPlanId: weddingPlan.id })),
  });

  const guestData: Array<{ name: string; side: Side; rsvpStatus: RsvpStatus; plusOne?: boolean }> = [
    { name: "Yaa Asantewaa", side: "BRIDE", rsvpStatus: "YES", plusOne: true },
    { name: "Kojo Antwi", side: "GROOM", rsvpStatus: "YES" },
    { name: "Akua Serwaa", side: "BRIDE", rsvpStatus: "PENDING" },
    { name: "Kwabena Kyeremeh", side: "GROOM", rsvpStatus: "PENDING" },
    { name: "Afia Owusu", side: "BRIDE", rsvpStatus: "YES" },
    { name: "Nana Ampadu", side: "BOTH", rsvpStatus: "YES", plusOne: true },
    { name: "Esi Bonsu", side: "BRIDE", rsvpStatus: "NO" },
    { name: "Yaw Darko", side: "GROOM", rsvpStatus: "YES" },
  ];
  await prisma.guest.createMany({
    data: guestData.map((g) => ({ ...g, weddingPlanId: weddingPlan.id })),
  });

  // Closes the gap that used to leave this account with zero
  // BudgetCategory/VendorInterest/HoneymoonPlan rows — Budget, Vendors,
  // Dashboard and BisaAI all need real content here to be testable, same
  // reasoning as the demo account below. Reuses the exact same shared
  // helpers rather than hand-rolling a second data set.
  await seedBudgetCategories(weddingPlan.id);
  const touchedCategories = await seedVendorInterests(weddingPlan.id, vendors);
  await syncSeededVendorBooking(weddingPlan.id, touchedCategories);
  await seedHoneymoonPlan(weddingPlan.id); // creates the HoneymoonPlan row *and* its default checklist items

  console.log(`  seeded dev-only Wedding Pass test account (${TEST_PASS_USER_EMAIL} / ${TEST_PASS_USER_PASSWORD})`);
}

// ---------------------------------------------------------------------------
// Dev-only Free test account — the Free-tier counterpart to the Wedding
// Pass account above. Same guard, same shared seed helpers as the demo
// account (seedSampleWedding) for equivalent richness, distinct from that
// account's "Ama & Kwame" marketing-flavored identity and content.
// ---------------------------------------------------------------------------

async function seedFreeTestAccount(vendors: Awaited<ReturnType<typeof seedVendors>>) {
  const supabaseId = await getOrCreateSupabaseId(FREE_TEST_USER_EMAIL, FREE_TEST_USER_PASSWORD, "Free Test Account");
  const user = await prisma.user.create({
    data: {
      supabaseId,
      email: FREE_TEST_USER_EMAIL,
      name: "Free Test Account",
      authProvider: "email",
      emailVerified: true,
    },
  });

  const weddingDate = new Date();
  weddingDate.setMonth(weddingDate.getMonth() + 6);

  const weddingPlan = await prisma.weddingPlan.create({
    data: {
      coupleNames: "Free Test Account",
      weddingDate,
      totalBudgetGHS: 100_000,
      city: "ACCRA",
      guestEstimate: 150,
      tradition: "Ga",
      hasWeddingPass: false,
      ownerUserId: user.id,
      members: {
        create: { userId: user.id, role: "OWNER" },
      },
    },
  });

  await seedBudgetCategories(weddingPlan.id);
  await seedChecklist(weddingPlan.id, weddingDate);
  await seedGuests(weddingPlan.id);
  const touchedCategories = await seedVendorInterests(weddingPlan.id, vendors);
  await syncSeededVendorBooking(weddingPlan.id, touchedCategories);
  await seedTraditionalCeremonyItems(weddingPlan.id);
  await seedHoneymoonPlan(weddingPlan.id);

  console.log(`  seeded dev-only Free test account (${FREE_TEST_USER_EMAIL} / ${FREE_TEST_USER_PASSWORD})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
