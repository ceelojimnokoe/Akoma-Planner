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
import { VENDOR_SEED_DATA, TRADITIONAL_LIST_SEED_DATA, ACCOMMODATION_SEED_DATA } from "../src/lib/reference-data";

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
  const created = await Promise.all(
    VENDOR_SEED_DATA.map((v) => prisma.vendor.create({ data: v }))
  );

  console.log(`  seeded ${created.length} vendors`);
  return created;
}

// ---------------------------------------------------------------------------
// Traditional list items — ESTIMATED price ranges only, tied to a real market
// ---------------------------------------------------------------------------

async function seedTraditionalListItems() {
  await prisma.traditionalListItem.createMany({ data: TRADITIONAL_LIST_SEED_DATA });
  console.log(`  seeded ${TRADITIONAL_LIST_SEED_DATA.length} traditional list items`);
}

// ---------------------------------------------------------------------------
// Accommodation — loosely linked to a seeded venue vendor for distance context
// ---------------------------------------------------------------------------

async function seedAccommodations(vendors: Awaited<ReturnType<typeof seedVendors>>) {
  const vendorIdByName = new Map(vendors.map((v) => [v.name, v.id]));
  const accommodations = ACCOMMODATION_SEED_DATA.map(({ nearVendorName, ...rest }) => ({
    ...rest,
    nearVendorId: vendorIdByName.get(nearVendorName),
  }));

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
