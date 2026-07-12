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

import { PrismaClient, City, VendorCategory, Side, RsvpStatus, VendorInterestStatus } from "@prisma/client";
import { buildDefaultChecklist } from "../src/lib/checklist-defaults";
import { STUB_USER_EMAIL, STUB_USER_PASSWORD } from "../src/lib/session";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding AkomaPlanner...");

  await clearExistingData();

  const vendors = await seedVendors();
  await seedTraditionalListItems();
  await seedAccommodations(vendors);
  await seedSampleWedding(vendors);

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

    // Transport
    { name: "Prestige Wedding Cars Accra", category: "TRANSPORT", city: "ACCRA", description: "Decorated luxury car hire for the couple and bridal party.", priceLowGHS: 1500, priceHighGHS: 6000, rating: 4.5, contactPhone: "+233 24 888 9900", isProFeatured: false },
    { name: "VIP Fleet Rentals", category: "TRANSPORT", city: "ACCRA", description: "Guest shuttle buses plus a decorated lead car.", priceLowGHS: 2500, priceHighGHS: 9000, rating: 4.3, contactPhone: "+233 24 888 9901", isProFeatured: false },
    { name: "Kumasi Classic Car Hire", category: "TRANSPORT", city: "KUMASI", description: "Vintage and modern luxury car hire with driver.", priceLowGHS: 1200, priceHighGHS: 5000, rating: 4.4, contactPhone: "+233 24 888 9902", isProFeatured: false },
    { name: "Golden Wheels Rentals", category: "TRANSPORT", city: "KUMASI", description: "Guest shuttle service for out-of-town family.", priceLowGHS: 1800, priceHighGHS: 6500, rating: 4.2, contactPhone: "+233 24 888 9903", isProFeatured: false },

    // Cake
    { name: "Sweet Delights Cakes", category: "CAKE", city: "ACCRA", description: "Multi-tier custom wedding cakes, delivery included.", priceLowGHS: 1200, priceHighGHS: 5000, rating: 4.6, contactPhone: "+233 24 999 0011", isProFeatured: false },
    { name: "The Cake Studio Accra", category: "CAKE", city: "ACCRA", description: "Modern cake design with tasting sessions.", priceLowGHS: 1500, priceHighGHS: 6000, rating: 4.7, contactPhone: "+233 24 999 0012", isProFeatured: true },
    { name: "Kumasi Cake Boutique", category: "CAKE", city: "KUMASI", description: "Custom-flavoured tiered cakes, halal options available.", priceLowGHS: 1000, priceHighGHS: 4500, rating: 4.5, contactPhone: "+233 24 999 0013", isProFeatured: false },
    { name: "Ohemaa's Cake Corner", category: "CAKE", city: "KUMASI", description: "Traditional and modern cake designs, small-batch bakery.", priceLowGHS: 900, priceHighGHS: 4000, rating: 4.4, contactPhone: "+233 24 999 0014", isProFeatured: false },

    // Other
    { name: "Grace Events Coordination", category: "OTHER", city: "ACCRA", description: "Full-service day-of wedding coordination team.", priceLowGHS: 3000, priceHighGHS: 10000, rating: 4.6, contactPhone: "+233 24 000 1122", isProFeatured: true },
    { name: "Kumasi Wedding Concierge", category: "OTHER", city: "KUMASI", description: "Vendor liaison and day-of coordination service.", priceLowGHS: 2500, priceHighGHS: 8000, rating: 4.5, contactPhone: "+233 24 000 1123", isProFeatured: false },
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
  const user = await prisma.user.create({
    data: {
      email: STUB_USER_EMAIL,
      name: "Ama Owusu",
      passwordHash: await hashPassword(STUB_USER_PASSWORD),
      authProvider: "EMAIL",
      emailVerified: true,
    },
  });

  // Six months out — far enough that every checklist bucket (12mo down to
  // wedding-week items) has a mix of overdue, upcoming and future items,
  // which makes the dashboard and calendar views meaningful out of the box.
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
            { category: "DJ_BAND", status: "RESEARCHING" },
            { category: "MC", status: "NOT_STARTED" },
            { category: "DECOR", status: "NOT_STARTED" },
            { category: "FLORIST", status: "NOT_STARTED" },
            { category: "MAKEUP", status: "BOOKED" },
            { category: "HAIR", status: "NOT_STARTED" },
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
  await seedVendorInterests(weddingPlan.id, vendors);
  await seedAiLogs(weddingPlan.id);

  console.log(`  seeded wedding plan "${weddingPlan.coupleNames}" (${weddingPlan.id})`);
}

async function seedBudgetCategories(weddingPlanId: string) {
  const categories = [
    { name: "Venue", allocatedGHS: 30000, spentGHS: 15000 },
    { name: "Catering", allocatedGHS: 25000, spentGHS: 5000 },
    { name: "Attire", allocatedGHS: 15000, spentGHS: 8000 },
    { name: "Photography & Media", allocatedGHS: 10000, spentGHS: 3000 },
    { name: "Traditional Rites", allocatedGHS: 12000, spentGHS: 12000 },
    { name: "Decor", allocatedGHS: 10000, spentGHS: 0 },
    { name: "Music & Entertainment", allocatedGHS: 8000, spentGHS: 2000 },
    { name: "Transport", allocatedGHS: 5000, spentGHS: 0 },
    { name: "Cake", allocatedGHS: 2000, spentGHS: 0 },
  ];

  await prisma.budgetCategory.createMany({
    data: categories.map((c) => ({ ...c, weddingPlanId })),
  });
}

async function seedChecklist(weddingPlanId: string, weddingDate: Date) {
  const items = buildDefaultChecklist(weddingDate);
  const now = new Date();

  await prisma.checklistItem.createMany({
    data: items.map((item) => ({
      weddingPlanId,
      title: item.title,
      category: item.category,
      dueDate: item.dueDate,
      isDefault: item.isDefault,
      priority: item.priority,
      // Mark anything already due as done, so the seeded checklist shows
      // believable progress instead of either "0% done" or "already late."
      done: item.dueDate < now,
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
    status: VendorInterestStatus;
    draftMessage?: string;
    quoteAmountGHS?: number;
    notes?: string;
  }> = [
    {
      vendorId: byName("Silver Star Gardens").id,
      status: "ACCEPTED",
      draftMessage: "Hi, we'd love to book Silver Star Gardens for our reception on the wedding date — could you confirm availability and send a quote for 250 guests?",
      quoteAmountGHS: 28000,
      notes: "Booked — deposit paid outside the app for now (payments are stubbed in this MVP).",
    },
    {
      vendorId: byName("Bisa's Kitchen Catering").id,
      status: "QUOTED",
      draftMessage: "Hello, could you share a catering quote for 250 guests, mixed Ghanaian and continental menu?",
      quoteAmountGHS: 22500,
      notes: "Quote received — waiting on the couple to review before approving.",
    },
    {
      vendorId: byName("Lensmen Studios").id,
      status: "SENT",
      draftMessage: "Hi Lensmen Studios, we're planning our wedding and would like a full-day photography + drone package quote.",
      notes: "Message sent, awaiting vendor reply.",
    },
    {
      vendorId: byName("Ashanti Kente Weavers").id,
      status: "DRAFT",
      draftMessage: "Hello, we'd like a custom kente order for both families — could you let us know pricing and lead time?",
      notes: "Drafted by BisaAI, not yet sent — couple still reviewing wording.",
    },
  ];

  for (const interest of interests) {
    await prisma.vendorInterest.create({ data: { ...interest, weddingPlanId } });
  }
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

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
